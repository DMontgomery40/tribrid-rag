from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CostEstimate(BaseModel):
    operation: Literal["index", "search", "answer"]
    embedding_tokens: int
    embedding_cost: float
    llm_tokens: int
    llm_cost: float
    total_cost: float


class CostRecord(BaseModel):
    record_id: str
    operation: str
    repo_id: str
    tokens: int
    cost: float
    timestamp: datetime


class CostSummary(BaseModel):
    period: Literal["day", "week", "month"]
    total_cost: float
    by_operation: dict[str, float]
    by_repo: dict[str, float]
