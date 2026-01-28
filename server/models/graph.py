from typing import Any, Literal

from pydantic import BaseModel


class Entity(BaseModel):
    entity_id: str
    name: str
    entity_type: Literal["function", "class", "module", "variable", "concept"]
    file_path: str | None
    description: str | None
    properties: dict[str, Any] = {}


class Relationship(BaseModel):
    source_id: str
    target_id: str
    relation_type: Literal["calls", "imports", "inherits", "contains", "references", "related_to"]
    weight: float = 1.0
    properties: dict[str, Any] = {}


class Community(BaseModel):
    community_id: str
    name: str
    summary: str
    member_ids: list[str]
    level: int  # hierarchy level


class GraphStats(BaseModel):
    repo_id: str
    total_entities: int
    total_relationships: int
    total_communities: int
    entity_breakdown: dict[str, int]  # type -> count
    relationship_breakdown: dict[str, int]  # type -> count
