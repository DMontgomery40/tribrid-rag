from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from server.config import load_config
from server.db.postgres import PostgresClient
from server.indexing.chunker import Chunker
from server.indexing.embedder import Embedder
from server.indexing.loader import FileLoader
from server.models.index import IndexRequest, IndexStats, IndexStatus

router = APIRouter(tags=["index"])

_STATUS: dict[str, IndexStatus] = {}
_STATS: dict[str, IndexStats] = {}


async def _run_index(repo_id: str, repo_path: str, force_reindex: bool) -> IndexStats:
    cfg = load_config()

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
    embedder = Embedder(cfg.embedding)
    postgres = PostgresClient(cfg.indexing.postgres_url)

    total_files = 0
    total_chunks = 0
    total_tokens = 0
    file_breakdown: dict[str, int] = defaultdict(int)

    prev_status = _STATUS.get(repo_id)
    started_at = prev_status.started_at if prev_status and prev_status.started_at else datetime.now(timezone.utc)

    all_chunks = []
    for rel_path, content in loader.load_repo(repo_path):
        total_files += 1
        ext = "." + rel_path.split(".")[-1] if "." in rel_path else ""
        file_breakdown[ext] += 1

        _STATUS[repo_id] = IndexStatus(
            repo_id=repo_id,
            status="indexing",
            progress=0.0,
            current_file=rel_path,
            started_at=started_at,
        )

        chunks = chunker.chunk_file(rel_path, content)
        total_chunks += len(chunks)
        total_tokens += sum(int(c.token_count or 0) for c in chunks)
        all_chunks.extend(chunks)

    # Embed + store
    embedded = await embedder.embed_chunks(all_chunks)
    await postgres.upsert_embeddings(repo_id, embedded)
    await postgres.upsert_fts(repo_id, embedded)

    # Stash embedding model for stats consumers
    PostgresClient._STORE.setdefault(repo_id, {})["embedding_model"] = cfg.embedding.embedding_model

    stats = IndexStats(
        repo_id=repo_id,
        total_files=total_files,
        total_chunks=total_chunks,
        total_tokens=total_tokens,
        embedding_model=cfg.embedding.embedding_model,
        embedding_dimensions=embedder.dim,
        last_indexed=datetime.now(timezone.utc),
        file_breakdown=dict(file_breakdown),
    )
    _STATS[repo_id] = stats
    return stats


@router.post("/index", response_model=IndexStatus)
async def start_index(request: IndexRequest) -> IndexStatus:
    started_at = datetime.now(timezone.utc)
    _STATUS[request.repo_id] = IndexStatus(
        repo_id=request.repo_id,
        status="indexing",
        progress=0.0,
        current_file=None,
        started_at=started_at,
    )

    try:
        await _run_index(request.repo_id, request.repo_path, request.force_reindex)
    except Exception as e:
        prev = _STATUS.get(request.repo_id)
        _STATUS[request.repo_id] = IndexStatus(
            repo_id=request.repo_id,
            status="error",
            progress=0.0,
            current_file=prev.current_file if prev else None,
            error=str(e),
            started_at=started_at,
            completed_at=datetime.now(timezone.utc),
        )
        raise HTTPException(status_code=500, detail=str(e))

    _STATUS[request.repo_id] = IndexStatus(
        repo_id=request.repo_id,
        status="complete",
        progress=1.0,
        current_file=None,
        started_at=started_at,
        completed_at=datetime.now(timezone.utc),
    )
    return _STATUS[request.repo_id]


@router.get("/index/{repo_id}/status", response_model=IndexStatus)
async def get_index_status(repo_id: str) -> IndexStatus:
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


@router.get("/index/{repo_id}/stats", response_model=IndexStats)
async def get_index_stats(repo_id: str) -> IndexStats:
    if repo_id in _STATS:
        return _STATS[repo_id]
    # Try to read from in-memory store (if indexed by another process)
    cfg = load_config()
    postgres = PostgresClient(cfg.indexing.postgres_url)
    stats = await postgres.get_index_stats(repo_id)
    if stats.total_chunks == 0:
        raise HTTPException(status_code=404, detail=f"No index found for repo_id={repo_id}")
    return stats


@router.delete("/index/{repo_id}")
async def delete_index(repo_id: str) -> dict[str, Any]:
    cfg = load_config()
    postgres = PostgresClient(cfg.indexing.postgres_url)
    deleted_vec = await postgres.delete_embeddings(repo_id)
    deleted_fts = await postgres.delete_fts(repo_id)
    _STATUS.pop(repo_id, None)
    _STATS.pop(repo_id, None)
    return {"ok": True, "deleted_embeddings": deleted_vec, "deleted_fts": deleted_fts}
