from server.models.config import ChunkerConfig
from server.models.index import Chunk


class Chunker:
    def __init__(self, config: ChunkerConfig):
        self.config = config

    def chunk_file(self, file_path: str, content: str) -> list[Chunk]:
        raise NotImplementedError

    def chunk_ast(self, file_path: str, content: str, language: str) -> list[Chunk]:
        raise NotImplementedError

    def chunk_semantic(self, file_path: str, content: str) -> list[Chunk]:
        raise NotImplementedError

    def chunk_fixed(self, file_path: str, content: str) -> list[Chunk]:
        raise NotImplementedError
