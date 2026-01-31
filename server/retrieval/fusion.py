from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING, Any

from server.db.neo4j import Neo4jClient
from server.db.postgres import PostgresClient
from server.indexing.embedder import Embedder
from server.models.retrieval import ChunkMatch
from server.models.tribrid_config_model import FusionConfig
from server.services.config_store import get_config as load_scoped_config

if TYPE_CHECKING:
    from server.retrieval.graph import GraphRetriever
    from server.retrieval.sparse import SparseRetriever
    from server.retrieval.vector import VectorRetriever


class TriBridFusion:
    def __init__(self, vector: VectorRetriever | None, sparse: SparseRetriever | None, graph: GraphRetriever | None):
        self.vector = vector
        self.sparse = sparse
        self.graph = graph
        # Populated after each search() call; used by API layers to expose deterministic debug.
        self.last_debug: dict[str, Any] = {}

    async def search(
        self,
        repo_id: str,
        query: str,
        config: FusionConfig,
        *,
        include_vector: bool = True,
        include_sparse: bool = True,
        include_graph: bool = True,
        top_k: int | None = None,
    ) -> list[ChunkMatch]:
        cfg = await load_scoped_config(repo_id=repo_id)

        # Use real storage backends per corpus config.
        postgres = PostgresClient(cfg.indexing.postgres_url)
        await postgres.connect()

        embedder = Embedder(cfg.embedding)

        vector_results: list[ChunkMatch] = []
        sparse_results: list[ChunkMatch] = []
        graph_results: list[ChunkMatch] = []
        debug: dict[str, Any] = {
            "fusion_vector_requested": bool(include_vector),
            "fusion_sparse_requested": bool(include_sparse),
            "fusion_graph_requested": bool(include_graph),
            "fusion_vector_enabled": bool(cfg.vector_search.enabled),
            "fusion_sparse_enabled": bool(cfg.sparse_search.enabled),
            "fusion_graph_enabled": bool(cfg.graph_search.enabled),
            "fusion_vector_results": 0,
            "fusion_sparse_results": 0,
            "fusion_graph_entity_hits": 0,
            "fusion_graph_hydrated_chunks": 0,
            "fusion_graph_attempted": False,
            "fusion_graph_error": None,
        }

        # Run legs (request toggles + config.*.enabled)
        if include_vector and cfg.vector_search.enabled:
            q_emb = await embedder.embed(query)
            vector_results = await postgres.vector_search(repo_id, q_emb, int(top_k or cfg.vector_search.top_k))
            if cfg.vector_search.similarity_threshold > 0:
                vector_results = [r for r in vector_results if r.score >= cfg.vector_search.similarity_threshold]
        debug["fusion_vector_results"] = len(vector_results)

        if include_sparse and cfg.sparse_search.enabled:
            sparse_results = await postgres.sparse_search(
                repo_id,
                query,
                int(top_k or cfg.sparse_search.top_k),
                ts_config=cfg.indexing.postgres_ts_config,
            )
        debug["fusion_sparse_results"] = len(sparse_results)

        # Graph retrieval: query Neo4j for relevant entities, then hydrate to chunks from Postgres.
        if include_graph and cfg.graph_search.enabled:
            debug["fusion_graph_attempted"] = True
            try:
                neo4j = Neo4jClient(
                    cfg.graph_storage.neo4j_uri,
                    cfg.graph_storage.neo4j_user,
                    cfg.graph_storage.neo4j_password,
                    database=cfg.graph_storage.neo4j_database,
                )
                await neo4j.connect()
                entity_hits = await neo4j.graph_search(
                    repo_id, query, cfg.graph_search.max_hops, int(top_k or cfg.graph_search.top_k)
                )
                await neo4j.disconnect()
            except Exception as e:
                debug["fusion_graph_error"] = str(e)
                entity_hits = []

            debug["fusion_graph_entity_hits"] = len(entity_hits)
            # Hydrate entity hits to chunk matches
            seen: set[str] = set()
            for hit in entity_hits:
                fp = (hit.file_path or "").strip()
                if not fp:
                    continue
                start = int(hit.start_line or 1) or 1
                end = int(hit.end_line or start) or start
                chunks = await postgres.get_chunks_for_file_span(repo_id, fp, start, end, limit=1)
                if not chunks:
                    continue
                ch = chunks[0]
                if ch.chunk_id in seen:
                    continue
                seen.add(ch.chunk_id)
                graph_results.append(
                    ChunkMatch(
                        chunk_id=ch.chunk_id,
                        content=ch.content,
                        file_path=ch.file_path,
                        start_line=ch.start_line,
                        end_line=ch.end_line,
                        language=ch.language,
                        score=float(hit.score or 1.0),
                        source="graph",
                        metadata={**(hit.metadata or {}), "graph_entity_id": hit.metadata.get("entity_id") if hit.metadata else None},
                    )
                )
            debug["fusion_graph_hydrated_chunks"] = len(graph_results)

        # Fuse
        results: list[ChunkMatch]
        if config.method == "rrf":
            results = self.rrf_fusion([vector_results, sparse_results, graph_results], k=int(config.rrf_k))
        else:
            v = list(vector_results)
            s = list(sparse_results)
            g = list(graph_results)
            if config.normalize_scores:
                v = _normalize(v)
                s = _normalize(s)
                g = _normalize(g)
            results = self.weighted_fusion([v, s, g], weights=[config.vector_weight, config.sparse_weight, config.graph_weight])

        # Apply final_k cap (caller can override with top_k)
        final_k = int(top_k or cfg.retrieval.final_k)
        self.last_debug = debug
        return results[:final_k]

    def rrf_fusion(self, results: list[list[ChunkMatch]], k: int) -> list[ChunkMatch]:
        scores: dict[str, float] = defaultdict(float)
        chunk_map: dict[str, ChunkMatch] = {}
        for result_list in results:
            for rank, chunk in enumerate(result_list):
                scores[chunk.chunk_id] += 1.0 / (k + rank + 1)
                chunk_map[chunk.chunk_id] = chunk
        sorted_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)
        return [chunk_map[cid].model_copy(update={"score": scores[cid]}) for cid in sorted_ids]

    def weighted_fusion(self, results: list[list[ChunkMatch]], weights: list[float]) -> list[ChunkMatch]:
        scores: dict[str, float] = defaultdict(float)
        chunk_map: dict[str, ChunkMatch] = {}
        for weight, result_list in zip(weights, results, strict=False):
            for chunk in result_list:
                scores[chunk.chunk_id] += chunk.score * weight
                chunk_map[chunk.chunk_id] = chunk
        sorted_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)
        return [chunk_map[cid].model_copy(update={"score": scores[cid]}) for cid in sorted_ids]


def _normalize(chunks: list[ChunkMatch]) -> list[ChunkMatch]:
    if not chunks:
        return chunks
    mx = max((c.score for c in chunks), default=0.0)
    if mx <= 0:
        return chunks
    return [c.model_copy(update={"score": float(c.score) / float(mx)}) for c in chunks]
