import fnmatch
from collections.abc import Iterator
from pathlib import Path

_LANG_BY_EXT: dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".md": "markdown",
    ".toml": "toml",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
}


class FileLoader:
    def __init__(self, ignore_patterns: list[str] | None = None):
        self.ignore_patterns = ignore_patterns or []

    def load_repo(self, repo_path: str) -> Iterator[tuple[str, str]]:  # (path, content)
        root = Path(repo_path).expanduser().resolve()
        if not root.exists():
            return
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = str(path.relative_to(root))
            if not self.should_include(rel):
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            yield rel, content

    def should_include(self, file_path: str) -> bool:
        fp = file_path.replace("\\", "/")
        # Skip hidden dirs/files
        if any(part.startswith(".") for part in fp.split("/")):
            return False
        for pat in self.ignore_patterns:
            if not pat:
                continue
            if fnmatch.fnmatch(fp, pat) or fnmatch.fnmatch(Path(fp).name, pat):
                return False
        return True

    def detect_language(self, file_path: str) -> str | None:
        ext = Path(file_path).suffix.lower()
        return _LANG_BY_EXT.get(ext)
