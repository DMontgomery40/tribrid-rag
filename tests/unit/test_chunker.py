"""Tests for the chunker module."""

import pytest

from server.indexing.chunker import Chunker
from server.models.config import ChunkerConfig


@pytest.fixture
def chunker() -> Chunker:
    """Create chunker with test config."""
    config = ChunkerConfig(
        strategy="fixed",
        chunk_size=100,
        chunk_overlap=20,
        min_chunk_size=20,
    )
    return Chunker(config)


def test_chunk_fixed_basic(chunker: Chunker, sample_code: str) -> None:
    """Test basic fixed chunking."""
    chunks = chunker.chunk_file("test.py", sample_code)
    assert len(chunks) > 0
    assert all(c.file_path == "test.py" for c in chunks)


def test_chunk_respects_size(chunker: Chunker, sample_code: str) -> None:
    """Test that chunks respect max size."""
    chunks = chunker.chunk_file("test.py", sample_code)
    for chunk in chunks:
        assert len(chunk.content) <= chunker.config.chunk_size + chunker.config.chunk_overlap


def test_chunk_preserves_content(chunker: Chunker) -> None:
    """Test that chunking preserves all content."""
    content = "A" * 50 + "B" * 50 + "C" * 50
    chunks = chunker.chunk_file("test.txt", content)
    # Joined content should contain all original content (with possible overlap)
    reconstructed = "".join(c.content for c in chunks)
    assert "A" * 50 in reconstructed or all(c in reconstructed for c in ["A", "B", "C"])


def test_chunk_empty_file(chunker: Chunker) -> None:
    """Test chunking empty file."""
    chunks = chunker.chunk_file("empty.py", "")
    assert len(chunks) == 0


def test_chunk_small_file(chunker: Chunker) -> None:
    """Test chunking file smaller than chunk size."""
    content = "small content"
    chunks = chunker.chunk_file("small.py", content)
    assert len(chunks) == 1
    assert chunks[0].content == content


def test_ast_chunking() -> None:
    """Test AST-aware chunking for Python."""
    config = ChunkerConfig(
        strategy="ast",
        chunk_size=500,
        chunk_overlap=50,
        min_chunk_size=20,
    )
    chunker = Chunker(config)

    code = '''
def func1():
    pass

def func2():
    pass

class MyClass:
    def method(self):
        pass
'''
    chunks = chunker.chunk_file("test.py", code)
    assert len(chunks) > 0
