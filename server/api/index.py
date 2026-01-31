from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.responses import StreamingResponse

from server.db.neo4j import Neo4jClient
from server.db.postgres import PostgresClient
from server.indexing.chunker import Chunker
from server.indexing.embedder import Embedder
from server.indexing.graph_builder import GraphBuilder
from server.indexing.loader import FileLoader
from server.models.index import IndexRequest, IndexStats, IndexStatus
from server.models.tribrid_config_model import CorpusScope, VocabPreviewResponse
from server.services.config_store import get_config as load_scoped_config

router = APIRouter(tags=["index"])

_STATUS: dict[str, IndexStatus] = {}
_STATS: dict[str, IndexStats] = {}
_TASKS: dict[str, asyncio.Task[None]] = {}
_EVENT_QUEUES: dict[str, asyncio.Queue[dict[str, Any]]] = {}
_LAST_STARTED_REPO: str | None = None


async def _run_index(
    repo_id: str,
    repo_path: str,
    force_reindex: bool,
    *,
    event_queue: asyncio.Queue[dict[str, Any]] | None = None,
) -> IndexStats:
    cfg = await load_scoped_config(repo_id=repo_id)

    if not force_reindex and repo_id in _STATS:
        return _STATS[repo_id]

    # Build ignore patterns from config
    ignore_patterns: list[str] = []
    exts = (cfg.indexing.index_excluded_exts or "").split(",")
    for ext in exts:
        ext = ext.strip()
        if not ext:
            continue
        if not ext.startswith("."):
            ext = "." + ext
        ignore_patterns.append(f"*{ext}")

    loader = FileLoader(ignore_patterns=ignore_patterns)
    chunker = Chunker(cfg.chunking)
    skip_dense = bool(int(cfg.indexing.skip_dense or 0) == 1)
    embedder = None if skip_dense else Embedder(cfg.embedding)
    postgres = PostgresClient(cfg.indexing.postgres_url)
    await postgres.connect()
    await postgres.upsert_corpus(repo_id, name=repo_id, root_path=repo_path)

    neo4j: Neo4jClient | None = None
    graph_builder: GraphBuilder | None = None
    try:
        if cfg.graph_search.enabled:
            neo4j = Neo4jClient(
                cfg.graph_storage.neo4j_uri,
                cfg.graph_storage.neo4j_user,
                cfg.graph_storage.neo4j_password,
                database=cfg.graph_storage.neo4j_database,
            )
            await neo4j.connect()
            graph_builder = GraphBuilder(neo4j)
    except Exception:
        # Graph layer is optional at runtime; vector + sparse indexing should still work.
        neo4j = None
        graph_builder = None

    total_files = 0
    total_chunks = 0
    total_tokens = 0
    file_breakdown: dict[str, int] = defaultdict(int)

    prev_status = _STATUS.get(repo_id)
    started_at = prev_status.started_at if prev_status and prev_status.started_at else datetime.now(UTC)

    # Collect file list once so we can report progress deterministically.
    files = list(loader.load_repo(repo_path))
    total_files = len(files)

    if force_reindex:
        await postgres.delete_chunks(repo_id)
        if neo4j is not None:
            await neo4j.delete_graph(repo_id)
        if event_queue is not None:
            await event_queue.put({"type": "log", "message": "🧹 Cleared existing index (force_reindex=1)"})

    # If skip_dense is enabled, ensure no stale embeddings remain from previous runs.
    # This makes graph-only / sparse-only workflows deterministic.
    if skip_dense:
        deleted = await postgres.delete_embeddings(repo_id)
        await postgres.update_corpus_embedding_meta(repo_id, model="", dimensions=0)
        if event_queue is not None:
            await event_queue.put(
                {"type": "log", "message": f"⚡ skip_dense=1 → skipping embeddings (cleared {deleted} existing vectors)"}
            )

    for idx, (rel_path, content) in enumerate(files, start=1):
        ext = "." + rel_path.split(".")[-1] if "." in rel_path else ""
        file_breakdown[ext] += 1

        _STATUS[repo_id] = IndexStatus(
            repo_id=repo_id,
            status="indexing",
            progress=idx / max(1, total_files),
            current_file=rel_path,
            started_at=started_at,
        )
        if event_queue is not None:
            await event_queue.put({"type": "progress", "percent": int((_STATUS[repo_id].progress) * 100), "message": rel_path})

        chunks = chunker.chunk_file(rel_path, content)
        total_chunks += len(chunks)
        total_tokens += sum(int(c.token_count or 0) for c in chunks)

        if skip_dense:
            await postgres.upsert_fts(repo_id, chunks, ts_config=cfg.indexing.postgres_ts_config)
        else:
            assert embedder is not None
            embedded = await embedder.embed_chunks(chunks)
            await postgres.upsert_embeddings(repo_id, embedded)
            await postgres.upsert_fts(repo_id, embedded, ts_config=cfg.indexing.postgres_ts_config)

    if graph_builder is not None:
        try:
            if event_queue is not None:
                await event_queue.put({"type": "log", "message": "🧠 Building Neo4j graph (entities + relationships)..."} )
            await graph_builder.build_graph_for_files(repo_id, files)
        except Exception:
            # Do not fail indexing if graph extraction is partial.
            pass

    if not skip_dense:
        assert embedder is not None
        await postgres.update_corpus_embedding_meta(repo_id, cfg.embedding.effective_model, embedder.dim)

    stats = IndexStats(
        repo_id=repo_id,
        total_files=total_files,
        total_chunks=total_chunks,
        total_tokens=total_tokens,
        embedding_model="" if skip_dense else cfg.embedding.effective_model,
        embedding_dimensions=0 if skip_dense else (embedder.dim if embedder is not None else 0),
        last_indexed=datetime.now(UTC),
        file_breakdown=dict(file_breakdown),
    )
    _STATS[repo_id] = stats
    return stats


async def _background_index_job(request: IndexRequest, queue: asyncio.Queue[dict[str, Any]]) -> None:
    repo_id = request.repo_id
    started_at = datetime.now(UTC)
    try:
        await queue.put({"type": "log", "message": f"🚀 Indexing started: {repo_id}"})
        await _run_index(
            repo_id,
            request.repo_path,
            request.force_reindex,
            event_queue=queue,
        )
        _STATUS[repo_id] = IndexStatus(
            repo_id=repo_id,
            status="complete",
            progress=1.0,
            current_file=None,
            started_at=started_at,
            completed_at=datetime.now(UTC),
        )
        await queue.put({"type": "complete", "message": "✓ Indexing complete"})
    except Exception as e:
        prev = _STATUS.get(repo_id)
        _STATUS[repo_id] = IndexStatus(
            repo_id=repo_id,
            status="error",
            progress=float(prev.progress) if prev else 0.0,
            current_file=prev.current_file if prev else None,
            error=str(e),
            started_at=started_at,
            completed_at=datetime.now(UTC),
        )
        await queue.put({"type": "error", "message": str(e)})
    finally:
        _TASKS.pop(repo_id, None)


@router.post("/index", response_model=IndexStatus)
async def start_index(request: IndexRequest) -> IndexStatus:
    global _LAST_STARTED_REPO

    # If already running, return current status.
    if request.repo_id in _TASKS and request.repo_id in _STATUS:
        return _STATUS[request.repo_id]

    started_at = datetime.now(UTC)
    _STATUS[request.repo_id] = IndexStatus(
        repo_id=request.repo_id,
        status="indexing",
        progress=0.0,
        current_file=None,
        started_at=started_at,
    )

    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=2000)
    _EVENT_QUEUES[request.repo_id] = queue
    _LAST_STARTED_REPO = request.repo_id

    task = asyncio.create_task(_background_index_job(request, queue))
    _TASKS[request.repo_id] = task
    return _STATUS[request.repo_id]


@router.post("/index/start", response_model=IndexStatus)
async def start_index_compat(payload: dict[str, Any] | None = None) -> IndexStatus:
    """Compatibility endpoint for legacy dashboard UI.

    Expected payload: {"repo_id": "...", "repo_path": "...", "force_reindex": bool}
    """
    payload = payload or {}
    repo_id = str(payload.get("repo_id") or payload.get("repo") or "").strip()
    repo_path = str(payload.get("repo_path") or payload.get("path") or "").strip()
    if not repo_id:
        raise HTTPException(status_code=422, detail="repo_id is required")
    if not repo_path:
        # Try to resolve from corpus registry
        cfg = await load_scoped_config(repo_id=None)
        pg = PostgresClient(cfg.indexing.postgres_url)
        await pg.connect()
        corpus = await pg.get_corpus(repo_id)
        if corpus is not None:
            repo_path = str(corpus.get("path") or "")
    if not repo_path:
        raise HTTPException(status_code=422, detail="repo_path is required (or create corpus first)")
    force_reindex = bool(payload.get("force_reindex") or payload.get("force") or False)
    return await start_index(IndexRequest(repo_id=repo_id, repo_path=repo_path, force_reindex=force_reindex))


@router.get("/index/{corpus_id}/status", response_model=IndexStatus)
async def get_index_status(corpus_id: str) -> IndexStatus:
    repo_id = corpus_id
    if repo_id in _STATUS:
        return _STATUS[repo_id]
    return IndexStatus(
        repo_id=repo_id,
        status="idle",
        progress=0.0,
        current_file=None,
        error=None,
        started_at=None,
        completed_at=None,
    )


@router.get("/index/{corpus_id}/stats", response_model=IndexStats)
async def get_index_stats(corpus_id: str) -> IndexStats:
    repo_id = corpus_id
    if repo_id in _STATS:
        return _STATS[repo_id]
    # Read from Postgres (source of truth)
    cfg = await load_scoped_config(repo_id=None)
    postgres = PostgresClient(cfg.indexing.postgres_url)
    await postgres.connect()
    stats = await postgres.get_index_stats(repo_id)
    if stats.total_chunks == 0:
        raise HTTPException(status_code=404, detail=f"No index found for repo_id={repo_id}")
    return stats


@router.delete("/index/{corpus_id}")
async def delete_index(corpus_id: str) -> dict[str, Any]:
    repo_id = corpus_id
    cfg = await load_scoped_config(repo_id=repo_id)
    postgres = PostgresClient(cfg.indexing.postgres_url)
    await postgres.connect()
    deleted_vec = await postgres.delete_embeddings(repo_id)
    deleted_fts = await postgres.delete_fts(repo_id)
    deleted_rows = await postgres.delete_chunks(repo_id)

    try:
        neo4j = Neo4jClient(
            cfg.graph_storage.neo4j_uri,
            cfg.graph_storage.neo4j_user,
            cfg.graph_storage.neo4j_password,
            database=cfg.graph_storage.neo4j_database,
        )
        await neo4j.connect()
        await neo4j.delete_graph(repo_id)
        await neo4j.disconnect()
    except Exception:
        # Graph layer optional
        pass
    _STATUS.pop(repo_id, None)
    _STATS.pop(repo_id, None)
    return {
        "ok": True,
        "deleted_chunks": deleted_rows,
        "deleted_embeddings": deleted_vec,
        "deleted_fts": deleted_fts,
    }


@router.get("/index/vocab-preview", response_model=VocabPreviewResponse)
async def get_vocab_preview(
    scope: CorpusScope = Depends(),
    top_n: int = Query(default=100, ge=10, le=500, description="Number of top terms to return"),
) -> VocabPreviewResponse:
    """Return a vocabulary preview from Postgres FTS (chunks.tsv).

    This powers the Indexing tab “Vocabulary Preview” tooling.
    """
    repo_id = (scope.resolved_repo_id or "").strip()
    if not repo_id:
        raise HTTPException(status_code=400, detail="Missing corpus_id (or legacy repo/repo_id) query parameter")

    cfg = await load_scoped_config(repo_id=repo_id)
    postgres = PostgresClient(cfg.indexing.postgres_url)
    await postgres.connect()
    terms, total_terms = await postgres.vocab_preview(repo_id, top_n=top_n)

    # Config-derived Postgres text search configuration label (LAW).
    tokenizer = str(cfg.indexing.bm25_tokenizer or "").strip() or "stemmer"
    ts_config = cfg.indexing.postgres_ts_config

    return VocabPreviewResponse(
        repo_id=repo_id,
        top_n=int(top_n),
        tokenizer=tokenizer,
        stemmer_lang=str(cfg.indexing.bm25_stemmer_lang or "") or None,
        stopwords_lang=str(cfg.indexing.bm25_stopwords_lang or "") or None,
        ts_config=ts_config,
        total_terms=int(total_terms),
        terms=terms,
    )


@router.get("/stream/operations/index")
async def stream_index_operation(scope: CorpusScope = Depends()) -> StreamingResponse:
    """SSE stream for indexing logs/progress (TerminalService.streamOperation compatibility)."""
    repo_id = (scope.resolved_repo_id or _LAST_STARTED_REPO or "").strip()
    if not repo_id:
        raise HTTPException(status_code=400, detail="Missing repo query parameter")
    if repo_id not in _EVENT_QUEUES:
        raise HTTPException(status_code=404, detail=f"No active stream for repo_id={repo_id}")

    queue = _EVENT_QUEUES[repo_id]

    async def _gen() -> AsyncGenerator[str, None]:
        # Immediately emit a status snapshot
        if repo_id in _STATUS:
            s = _STATUS[repo_id]
            yield f"data: {json.dumps({'type': 'progress', 'percent': int(s.progress * 100), 'message': s.current_file or ''})}\n\n"
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") in {"complete", "error"}:
                break

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
