"""Tests for configuration models."""

import pytest
from pydantic import ValidationError

from server.models.config import (
    EmbeddingConfig,
    FusionConfig,
    RerankerConfig,
    TriBridConfig,
)


def test_embedding_config_valid() -> None:
    """Test valid embedding config."""
    config = EmbeddingConfig(
        provider="openai",
        model="text-embedding-3-small",
        dimensions=1536,
    )
    assert config.provider == "openai"
    assert config.batch_size == 100  # default


def test_embedding_config_invalid_provider() -> None:
    """Test invalid embedding provider."""
    with pytest.raises(ValidationError):
        EmbeddingConfig(
            provider="invalid",
            model="test",
            dimensions=100,
        )


def test_fusion_config_weights() -> None:
    """Test fusion config weight validation."""
    config = FusionConfig(
        method="weighted",
        vector_weight=0.5,
        sparse_weight=0.3,
        graph_weight=0.2,
        rrf_k=60,
    )
    assert config.vector_weight + config.sparse_weight + config.graph_weight == 1.0


def test_reranker_modes() -> None:
    """Test reranker mode options."""
    for mode in ["none", "local", "trained", "api"]:
        config = RerankerConfig(mode=mode)
        assert config.mode == mode


def test_tribrid_config_complete(test_config: TriBridConfig) -> None:
    """Test complete TriBridConfig."""
    assert test_config.embedding is not None
    assert test_config.vector_search is not None
    assert test_config.sparse_search is not None
    assert test_config.graph_search is not None
    assert test_config.fusion is not None
    assert test_config.reranker is not None
    assert test_config.chunker is not None
    assert test_config.observability is not None


def test_config_json_serialization(test_config: TriBridConfig) -> None:
    """Test config can be serialized to JSON."""
    json_str = test_config.model_dump_json()
    assert "embedding" in json_str
    assert "fusion" in json_str

    # Can be deserialized back
    restored = TriBridConfig.model_validate_json(json_str)
    assert restored.embedding.provider == test_config.embedding.provider
