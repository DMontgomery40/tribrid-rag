from server.models.index import Chunk


class ChunkSummarizer:
    def __init__(self, llm_model: str):
        self.llm_model = llm_model

    async def summarize(self, chunk: Chunk) -> str:
        raise NotImplementedError

    async def summarize_batch(self, chunks: list[Chunk]) -> list[str]:
        raise NotImplementedError
