from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Chunk(BaseModel):
    chunk_id: str
    content: str
    file_path: str
    start_line: int
    end_line: int
    language: str | None
    token_count: int
    embedding: list[float] | None = None
    summary: str | None = None


class IndexRequest(BaseModel):
    repo_id: str
    repo_path: str
    force_reindex: bool = False


class IndexStatus(BaseModel):
    repo_id: str
    status: Literal["idle", "indexing", "complete", "error"]
    progress: float  # 0.0 to 1.0
    current_file: str | None
    error: str | None
    started_at: datetime | None
    completed_at: datetime | None


class IndexStats(BaseModel):
    repo_id: str
    total_files: int
    total_chunks: int
    total_tokens: int
    embedding_model: str
    embedding_dimensions: int
    last_indexed: datetime | None
    file_breakdown: dict[str, int]  # extension -> count
