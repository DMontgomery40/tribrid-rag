from datetime import datetime

from pydantic import BaseModel

from server.models.config import TriBridConfig


class DatasetEntry(BaseModel):
    entry_id: str
    question: str
    expected_chunks: list[str]  # chunk_ids that should be retrieved
    expected_answer: str | None
    tags: list[str] = []
    created_at: datetime


class EvalRequest(BaseModel):
    repo_id: str
    dataset_id: str | None = None  # None = use default
    sample_size: int | None = None  # None = all entries


class EvalMetrics(BaseModel):
    mrr: float  # Mean Reciprocal Rank
    recall_at_5: float
    recall_at_10: float
    recall_at_20: float
    precision_at_5: float
    ndcg_at_10: float
    latency_p50_ms: float
    latency_p95_ms: float


class EvalResult(BaseModel):
    entry_id: str
    question: str
    retrieved_chunks: list[str]
    expected_chunks: list[str]
    reciprocal_rank: float
    recall: float
    latency_ms: float


class EvalRun(BaseModel):
    run_id: str
    repo_id: str
    dataset_id: str
    config_snapshot: TriBridConfig
    metrics: EvalMetrics
    results: list[EvalResult]
    started_at: datetime
    completed_at: datetime
