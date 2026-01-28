from typing import Any, Literal

from pydantic import BaseModel

from server.models.index import Chunk


class ChunkMatch(BaseModel):
    chunk_id: str
    content: str
    file_path: str
    start_line: int
    end_line: int
    language: str | None
    score: float
    source: Literal["vector", "sparse", "graph"]
    metadata: dict[str, Any] = {}


class SearchRequest(BaseModel):
    query: str
    repo_id: str
    top_k: int = 20
    include_vector: bool = True
    include_sparse: bool = True
    include_graph: bool = True


class SearchResponse(BaseModel):
    query: str
    matches: list[ChunkMatch]
    fusion_method: str
    reranker_mode: str
    latency_ms: float
    debug: dict[str, Any] | None = None


class AnswerRequest(BaseModel):
    query: str
    repo_id: str
    top_k: int = 10
    stream: bool = False
    system_prompt: str | None = None


class AnswerResponse(BaseModel):
    query: str
    answer: str
    sources: list[ChunkMatch]
    model: str
    tokens_used: int
    latency_ms: float
