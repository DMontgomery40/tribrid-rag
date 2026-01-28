from server.models.config import RerankerConfig
from server.models.retrieval import ChunkMatch


class Reranker:
    def __init__(self, config: RerankerConfig):
        self.config = config
        self._model = None

    async def rerank(self, query: str, chunks: list[ChunkMatch]) -> list[ChunkMatch]:
        if self.config.mode == "none":
            return chunks[: self.config.top_n]
        elif self.config.mode == "local":
            return await self._rerank_local(query, chunks)
        elif self.config.mode == "trained":
            return await self._rerank_trained(query, chunks)
        elif self.config.mode == "api":
            return await self._rerank_api(query, chunks)
        return chunks

    async def _rerank_local(self, query: str, chunks: list[ChunkMatch]) -> list[ChunkMatch]:
        raise NotImplementedError

    async def _rerank_trained(self, query: str, chunks: list[ChunkMatch]) -> list[ChunkMatch]:
        raise NotImplementedError

    async def _rerank_api(self, query: str, chunks: list[ChunkMatch]) -> list[ChunkMatch]:
        raise NotImplementedError

    def load_model(self) -> None:
        raise NotImplementedError

    def reload_model(self) -> None:
        raise NotImplementedError
