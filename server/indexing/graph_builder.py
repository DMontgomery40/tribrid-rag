from server.db.neo4j import Neo4jClient
from server.models.graph import Entity, GraphStats, Relationship
from server.models.index import Chunk


class GraphBuilder:
    def __init__(self, neo4j: Neo4jClient):
        self.neo4j = neo4j

    async def extract_entities(self, chunks: list[Chunk]) -> list[Entity]:
        raise NotImplementedError

    async def extract_relationships(self, chunks: list[Chunk], entities: list[Entity]) -> list[Relationship]:
        raise NotImplementedError

    async def build_graph(self, repo_id: str, chunks: list[Chunk]) -> GraphStats:
        raise NotImplementedError

    def _extract_code_entities(self, chunk: Chunk) -> list[Entity]:
        raise NotImplementedError

    def _extract_semantic_entities(self, chunk: Chunk) -> list[Entity]:
        raise NotImplementedError

    def _infer_relationships(self, entities: list[Entity]) -> list[Relationship]:
        raise NotImplementedError
