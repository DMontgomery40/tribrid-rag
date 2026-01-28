from datetime import datetime

from pydantic import BaseModel

from server.models.graph import GraphStats
from server.models.index import IndexStats


class Repository(BaseModel):
    repo_id: str
    name: str
    path: str
    description: str | None
    created_at: datetime
    last_indexed: datetime | None


class RepoStats(BaseModel):
    repo_id: str
    file_count: int
    total_size_bytes: int
    language_breakdown: dict[str, int]
    index_stats: IndexStats | None
    graph_stats: GraphStats | None
