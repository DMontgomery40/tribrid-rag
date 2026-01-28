"""Tests for the fusion module."""

import pytest

from server.models.retrieval import ChunkMatch
from server.retrieval.fusion import TriBridFusion


def make_chunk(chunk_id: str, score: float, source: str) -> ChunkMatch:
    """Create a test chunk match."""
    return ChunkMatch(
        chunk_id=chunk_id,
        content=f"Content for {chunk_id}",
        file_path="test.py",
        start_line=1,
        end_line=10,
        language="python",
        score=score,
        source=source,
    )


def test_rrf_fusion_basic() -> None:
    """Test basic RRF fusion."""
    fusion = TriBridFusion(vector=None, sparse=None, graph=None)

    vector_results = [make_chunk("v1", 0.9, "vector"), make_chunk("v2", 0.8, "vector")]
    sparse_results = [make_chunk("s1", 0.85, "sparse"), make_chunk("v1", 0.7, "sparse")]
    graph_results = [make_chunk("g1", 0.95, "graph")]

    results = fusion.rrf_fusion(
        [vector_results, sparse_results, graph_results],
        k=60,
    )

    # v1 appears in both vector and sparse, should rank higher
    chunk_ids = [r.chunk_id for r in results]
    assert "v1" in chunk_ids


def test_rrf_fusion_empty() -> None:
    """Test RRF fusion with empty results."""
    fusion = TriBridFusion(vector=None, sparse=None, graph=None)
    results = fusion.rrf_fusion([[], [], []], k=60)
    assert len(results) == 0


def test_weighted_fusion() -> None:
    """Test weighted fusion."""
    fusion = TriBridFusion(vector=None, sparse=None, graph=None)

    vector_results = [make_chunk("v1", 0.9, "vector")]
    sparse_results = [make_chunk("s1", 0.8, "sparse")]
    graph_results = [make_chunk("g1", 0.7, "graph")]

    results = fusion.weighted_fusion(
        [vector_results, sparse_results, graph_results],
        weights=[0.4, 0.3, 0.3],
    )

    assert len(results) == 3


def test_weighted_fusion_normalization() -> None:
    """Test that weighted fusion normalizes scores."""
    fusion = TriBridFusion(vector=None, sparse=None, graph=None)

    # Same chunk with different scores from different sources
    vector_results = [make_chunk("c1", 0.9, "vector")]
    sparse_results = [make_chunk("c1", 0.6, "sparse")]

    results = fusion.weighted_fusion(
        [vector_results, sparse_results, []],
        weights=[0.5, 0.5, 0.0],
    )

    assert len(results) == 1
    # Combined score should be between the two
    assert 0.6 < results[0].score < 0.9
