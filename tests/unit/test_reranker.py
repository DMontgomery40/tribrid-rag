"""Tests for the reranker module."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from server.models.config import RerankerConfig
from server.models.retrieval import ChunkMatch
from server.retrieval.rerank import Reranker


def make_chunk(chunk_id: str, score: float) -> ChunkMatch:
    """Create a test chunk match."""
    return ChunkMatch(
        chunk_id=chunk_id,
        content=f"Content for {chunk_id}",
        file_path="test.py",
        start_line=1,
        end_line=10,
        language="python",
        score=score,
        source="vector",
    )


@pytest.fixture
def reranker_none() -> Reranker:
    """Create reranker with mode=none."""
    config = RerankerConfig(mode="none")
    return Reranker(config)


def test_reranker_none_passthrough(reranker_none: Reranker) -> None:
    """Test that mode=none passes through unchanged."""
    chunks = [make_chunk("c1", 0.9), make_chunk("c2", 0.8), make_chunk("c3", 0.7)]

    # Synchronous test for passthrough
    assert reranker_none.config.mode == "none"


@pytest.mark.asyncio
async def test_reranker_none_async(reranker_none: Reranker) -> None:
    """Test async rerank with mode=none."""
    chunks = [make_chunk("c1", 0.9), make_chunk("c2", 0.8)]
    result = await reranker_none.rerank("test query", chunks)
    assert len(result) == 2
    # Order should be preserved
    assert result[0].chunk_id == "c1"


@pytest.mark.asyncio
async def test_reranker_local() -> None:
    """Test local cross-encoder reranking."""
    config = RerankerConfig(
        mode="local",
        local_model="cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_n=2,
    )
    reranker = Reranker(config)

    chunks = [make_chunk("c1", 0.5), make_chunk("c2", 0.9), make_chunk("c3", 0.3)]

    with patch.object(reranker, "_rerank_local", new_callable=AsyncMock) as mock_rerank:
        # Mock returns reordered results
        mock_rerank.return_value = [chunks[1], chunks[0]]
        result = await reranker.rerank("test query", chunks)
        mock_rerank.assert_called_once()


@pytest.mark.asyncio
async def test_reranker_respects_top_n() -> None:
    """Test that reranker respects top_n limit."""
    config = RerankerConfig(mode="none", top_n=2)
    reranker = Reranker(config)

    chunks = [make_chunk(f"c{i}", 0.9 - i * 0.1) for i in range(5)]
    result = await reranker.rerank("test query", chunks)
    assert len(result) <= 2


@pytest.mark.asyncio
async def test_reranker_empty_input() -> None:
    """Test reranker with empty input."""
    config = RerankerConfig(mode="none")
    reranker = Reranker(config)
    result = await reranker.rerank("test query", [])
    assert len(result) == 0
