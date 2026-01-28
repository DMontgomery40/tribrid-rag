"""API tests for graph endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_entities(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/entities endpoint."""
    response = await client.get("/graph/test-repo/entities")
    assert response.status_code in [200, 404]  # 404 if repo doesn't exist

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_entities_filtered(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/entities with type filter."""
    response = await client.get(
        "/graph/test-repo/entities",
        params={"entity_type": "function", "limit": 10},
    )
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_get_entity(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/entity/{entity_id} endpoint."""
    response = await client.get("/graph/test-repo/entity/entity-123")
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_get_entity_relationships(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/entity/{entity_id}/relationships endpoint."""
    response = await client.get("/graph/test-repo/entity/entity-123/relationships")
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_list_communities(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/communities endpoint."""
    response = await client.get("/graph/test-repo/communities")
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_communities_by_level(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/communities with level filter."""
    response = await client.get(
        "/graph/test-repo/communities",
        params={"level": 0},
    )
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_get_graph_stats(client: AsyncClient) -> None:
    """Test GET /graph/{repo_id}/stats endpoint."""
    response = await client.get("/graph/test-repo/stats")
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        data = response.json()
        assert "total_entities" in data
        assert "total_relationships" in data


@pytest.mark.asyncio
async def test_graph_query(client: AsyncClient) -> None:
    """Test POST /graph/{repo_id}/query endpoint."""
    response = await client.post(
        "/graph/test-repo/query",
        params={"cypher": "MATCH (n) RETURN n LIMIT 5"},
    )
    assert response.status_code in [200, 400, 404]
