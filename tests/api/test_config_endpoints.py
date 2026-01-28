"""API tests for config endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_config(client: AsyncClient) -> None:
    """Test GET /config endpoint."""
    response = await client.get("/config")
    assert response.status_code == 200

    data = response.json()
    assert "embedding" in data
    assert "fusion" in data
    assert "reranker" in data


@pytest.mark.asyncio
async def test_update_config(client: AsyncClient, test_config) -> None:
    """Test PUT /config endpoint."""
    response = await client.put("/config", json=test_config.model_dump())
    assert response.status_code == 200

    data = response.json()
    assert data["embedding"]["provider"] == test_config.embedding.provider


@pytest.mark.asyncio
async def test_update_config_section(client: AsyncClient) -> None:
    """Test PATCH /config/{section} endpoint."""
    updates = {"top_k": 30}
    response = await client.patch("/config/vector_search", json=updates)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_reset_config(client: AsyncClient) -> None:
    """Test POST /config/reset endpoint."""
    response = await client.post("/config/reset")
    assert response.status_code == 200

    data = response.json()
    # Should return default config
    assert "embedding" in data


@pytest.mark.asyncio
async def test_invalid_config_section(client: AsyncClient) -> None:
    """Test updating invalid config section."""
    response = await client.patch("/config/invalid_section", json={})
    assert response.status_code in [400, 404, 422]
