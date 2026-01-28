import asyncpg

from server.models.index import Chunk, IndexStats
from server.models.retrieval import ChunkMatch


class PostgresClient:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(self.connection_string)

    async def disconnect(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    # Vector operations
    async def upsert_embeddings(self, repo_id: str, chunks: list[Chunk]) -> int:
        raise NotImplementedError

    async def vector_search(self, repo_id: str, embedding: list[float], top_k: int) -> list[ChunkMatch]:
        raise NotImplementedError

    async def delete_embeddings(self, repo_id: str) -> int:
        raise NotImplementedError

    # FTS operations
    async def upsert_fts(self, repo_id: str, chunks: list[Chunk]) -> int:
        raise NotImplementedError

    async def sparse_search(self, repo_id: str, query: str, top_k: int) -> list[ChunkMatch]:
        raise NotImplementedError

    async def delete_fts(self, repo_id: str) -> int:
        raise NotImplementedError

    # Metadata
    async def get_chunk(self, chunk_id: str) -> Chunk | None:
        raise NotImplementedError

    async def get_chunks(self, chunk_ids: list[str]) -> list[Chunk]:
        raise NotImplementedError

    async def get_index_stats(self, repo_id: str) -> IndexStats:
        raise NotImplementedError
