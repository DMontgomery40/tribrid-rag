"""Pytest fixtures for TriBridRAG tests."""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from server.main import app
from server.models.config import (
    ChunkerConfig,
    EmbeddingConfig,
    FusionConfig,
    GraphSearchConfig,
    ObservabilityConfig,
    RerankerConfig,
    SparseSearchConfig,
    TriBridConfig,
    VectorSearchConfig,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def test_config() -> TriBridConfig:
    """Create test configuration."""
    return TriBridConfig(
        embedding=EmbeddingConfig(
            provider="openai",
            model="text-embedding-3-small",
            dimensions=1536,
            batch_size=10,
        ),
        vector_search=VectorSearchConfig(
            enabled=True,
            top_k=10,
            similarity_threshold=0.0,
        ),
        sparse_search=SparseSearchConfig(
            enabled=True,
            top_k=10,
            bm25_k1=1.5,
            bm25_b=0.75,
        ),
        graph_search=GraphSearchConfig(
            enabled=True,
            max_hops=2,
            top_k=10,
            include_communities=True,
        ),
        fusion=FusionConfig(
            method="rrf",
            vector_weight=0.4,
            sparse_weight=0.3,
            graph_weight=0.3,
            rrf_k=60,
        ),
        reranker=RerankerConfig(
            mode="none",
            local_model=None,
            trained_model_path=None,
            api_provider=None,
            api_model=None,
            top_n=10,
            batch_size=16,
            max_length=512,
        ),
        chunker=ChunkerConfig(
            strategy="fixed",
            chunk_size=500,
            chunk_overlap=50,
            min_chunk_size=50,
        ),
        observability=ObservabilityConfig(
            metrics_enabled=False,
            tracing_enabled=False,
            grafana_url=None,
        ),
    )


@pytest.fixture
def sample_code() -> str:
    """Sample code for testing."""
    return '''
def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


class Calculator:
    """Simple calculator class."""

    def add(self, a: int, b: int) -> int:
        return a + b

    def subtract(self, a: int, b: int) -> int:
        return a - b
'''
