from neo4j import AsyncGraphDatabase
from typing import Any

from server.models.graph import Community, Entity, GraphStats, Relationship
from server.models.retrieval import ChunkMatch


class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self._driver = None

    async def connect(self) -> None:
        self._driver = AsyncGraphDatabase.driver(self.uri, auth=(self.user, self.password))

    async def disconnect(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None

    # Entity operations
    async def upsert_entity(self, repo_id: str, entity: Entity) -> None:
        raise NotImplementedError

    async def upsert_entities(self, repo_id: str, entities: list[Entity]) -> int:
        raise NotImplementedError

    async def get_entity(self, entity_id: str) -> Entity | None:
        raise NotImplementedError

    async def list_entities(self, repo_id: str, entity_type: str | None, limit: int) -> list[Entity]:
        raise NotImplementedError

    async def delete_entities(self, repo_id: str) -> int:
        raise NotImplementedError

    # Relationship operations
    async def upsert_relationship(self, repo_id: str, rel: Relationship) -> None:
        raise NotImplementedError

    async def upsert_relationships(self, repo_id: str, rels: list[Relationship]) -> int:
        raise NotImplementedError

    async def get_relationships(self, entity_id: str) -> list[Relationship]:
        raise NotImplementedError

    # Community operations
    async def detect_communities(self, repo_id: str) -> list[Community]:
        raise NotImplementedError

    async def get_communities(self, repo_id: str, level: int | None) -> list[Community]:
        raise NotImplementedError

    # Search
    async def graph_search(self, repo_id: str, query: str, max_hops: int, top_k: int) -> list[ChunkMatch]:
        raise NotImplementedError

    async def execute_cypher(self, query: str, params: dict[str, Any] | None) -> list[dict[str, Any]]:
        raise NotImplementedError

    # Stats
    async def get_graph_stats(self, repo_id: str) -> GraphStats:
        raise NotImplementedError
