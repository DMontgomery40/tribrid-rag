from __future__ import annotations

import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

import asyncpg  # type: ignore[import-untyped]

from server.models.index import Chunk, IndexStats
from server.models.retrieval import ChunkMatch


class PostgresClient:
    """In-memory index store (placeholder for pgvector/Postgres).

    The long-term target is Postgres + pgvector for dense embeddings and
    Postgres FTS/BM25 for sparse retrieval. Until the DB layer is fully
    implemented, we provide a deterministic in-memory implementation that
    supports indexing + search in tests and local dev.
    """

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._pool: asyncpg.Pool | None = None

    # Shared store across instances (repo_id -> data)
    _STORE: dict[str, dict[str, Any]] = {}

    async def connect(self) -> None:
        # Placeholder: DB connect is optional in this implementation.
        # If a real Postgres DSN is provided, this can be enabled later.
        return

    async def disconnect(self) -> None:
        return

    # Vector operations
    async def upsert_embeddings(self, repo_id: str, chunks: list[Chunk]) -> int:
        repo = self._STORE.setdefault(repo_id, {})
        repo.setdefault("chunks", {})
        repo.setdefault("embeddings", {})
        for ch in chunks:
            repo["chunks"][ch.chunk_id] = ch
            if ch.embedding is not None:
                repo["embeddings"][ch.chunk_id] = ch.embedding
        repo["last_indexed"] = datetime.now(timezone.utc)
        return len(chunks)

    async def vector_search(self, repo_id: str, embedding: list[float], top_k: int) -> list[ChunkMatch]:
        repo = self._STORE.get(repo_id)
        if not repo:
            return []
        embeddings: dict[str, list[float]] = repo.get("embeddings", {})
        chunks: dict[str, Chunk] = repo.get("chunks", {})
        if not embeddings:
            return []

        def dot(a: list[float], b: list[float]) -> float:
            return sum(x * y for x, y in zip(a, b))

        scored: list[tuple[str, float]] = []
        for cid, emb in embeddings.items():
            scored.append((cid, dot(embedding, emb)))
        scored.sort(key=lambda t: t[1], reverse=True)
        out: list[ChunkMatch] = []
        for cid, score in scored[: max(1, top_k)]:
            ch = chunks.get(cid)
            if not ch:
                continue
            out.append(
                ChunkMatch(
                    chunk_id=cid,
                    content=ch.content,
                    file_path=ch.file_path,
                    start_line=ch.start_line,
                    end_line=ch.end_line,
                    language=ch.language,
                    score=float(score),
                    source="vector",
                    metadata={},
                )
            )
        return out

    async def delete_embeddings(self, repo_id: str) -> int:
        repo = self._STORE.get(repo_id)
        if not repo:
            return 0
        n = len(repo.get("embeddings", {}))
        repo["embeddings"] = {}
        return n

    # FTS operations
    async def upsert_fts(self, repo_id: str, chunks: list[Chunk]) -> int:
        repo = self._STORE.setdefault(repo_id, {})
        repo.setdefault("chunks", {})
        repo.setdefault("fts_tokens", {})
        for ch in chunks:
            repo["chunks"][ch.chunk_id] = ch
            tokens = _tokenize(ch.content)
            repo["fts_tokens"][ch.chunk_id] = tokens
        repo["last_indexed"] = datetime.now(timezone.utc)
        return len(chunks)

    async def sparse_search(self, repo_id: str, query: str, top_k: int) -> list[ChunkMatch]:
        repo = self._STORE.get(repo_id)
        if not repo:
            return []
        chunks: dict[str, Chunk] = repo.get("chunks", {})
        token_sets: dict[str, Counter[str]] = repo.get("fts_tokens", {})
        if not token_sets:
            return []
        q = _tokenize(query)
        if not q:
            return []

        # Simple overlap scoring (placeholder for BM25)
        scored: list[tuple[str, float]] = []
        q_terms = set(q.keys())
        for cid, toks in token_sets.items():
            overlap = sum(1 for t in q_terms if t in toks)
            scored.append((cid, overlap / max(1, len(q_terms))))
        scored.sort(key=lambda t: t[1], reverse=True)

        out: list[ChunkMatch] = []
        for cid, score in scored[: max(1, top_k)]:
            ch = chunks.get(cid)
            if not ch:
                continue
            out.append(
                ChunkMatch(
                    chunk_id=cid,
                    content=ch.content,
                    file_path=ch.file_path,
                    start_line=ch.start_line,
                    end_line=ch.end_line,
                    language=ch.language,
                    score=float(score),
                    source="sparse",
                    metadata={},
                )
            )
        return out

    async def delete_fts(self, repo_id: str) -> int:
        repo = self._STORE.get(repo_id)
        if not repo:
            return 0
        n = len(repo.get("fts_tokens", {}))
        repo["fts_tokens"] = {}
        return n

    # Metadata
    async def get_chunk(self, chunk_id: str) -> Chunk | None:
        for repo in self._STORE.values():
            chunks: dict[str, Chunk] = repo.get("chunks", {})
            ch = chunks.get(chunk_id)
            if isinstance(ch, Chunk):
                return ch
        return None

    async def get_chunks(self, chunk_ids: list[str]) -> list[Chunk]:
        out: list[Chunk] = []
        wanted = set(chunk_ids)
        for repo in self._STORE.values():
            chunks: dict[str, Chunk] = repo.get("chunks", {})
            for cid in list(wanted):
                if cid in chunks:
                    out.append(chunks[cid])
                    wanted.remove(cid)
            if not wanted:
                break
        return out

    async def get_index_stats(self, repo_id: str) -> IndexStats:
        repo = self._STORE.get(repo_id)
        if not repo:
            return IndexStats(
                repo_id=repo_id,
                total_files=0,
                total_chunks=0,
                total_tokens=0,
                embedding_model="",
                embedding_dimensions=0,
                last_indexed=None,
                file_breakdown={},
            )

        chunks: dict[str, Chunk] = repo.get("chunks", {})
        total_chunks = len(chunks)
        total_tokens = sum(int(ch.token_count or 0) for ch in chunks.values())
        files = {ch.file_path for ch in chunks.values()}
        breakdown: dict[str, int] = defaultdict(int)
        for fp in files:
            ext = "." + fp.split(".")[-1] if "." in fp else ""
            breakdown[ext] += 1

        embeddings: dict[str, list[float]] = repo.get("embeddings", {})
        dim = len(next(iter(embeddings.values()))) if embeddings else 0

        return IndexStats(
            repo_id=repo_id,
            total_files=len(files),
            total_chunks=total_chunks,
            total_tokens=total_tokens,
            embedding_model=str(repo.get("embedding_model", "")),
            embedding_dimensions=dim,
            last_indexed=repo.get("last_indexed"),
            file_breakdown=dict(breakdown),
        )


def _tokenize(text: str) -> Counter[str]:
    # Cheap tokenizer: alphanumeric identifiers.
    terms = []
    cur = []
    for ch in (text or "").lower():
        if ch.isalnum() or ch == "_":
            cur.append(ch)
        else:
            if cur:
                terms.append("".join(cur))
                cur = []
    if cur:
        terms.append("".join(cur))
    return Counter(terms)
