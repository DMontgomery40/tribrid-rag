from collections.abc import Iterator
from pathlib import Path


class FileLoader:
    def __init__(self, ignore_patterns: list[str] | None = None):
        self.ignore_patterns = ignore_patterns or []

    def load_repo(self, repo_path: str) -> Iterator[tuple[str, str]]:  # (path, content)
        raise NotImplementedError

    def should_include(self, file_path: str) -> bool:
        raise NotImplementedError

    def detect_language(self, file_path: str) -> str | None:
        raise NotImplementedError
