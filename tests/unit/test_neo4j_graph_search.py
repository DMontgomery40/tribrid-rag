"""Unit tests for Neo4j graph_search without a live Neo4j instance."""

from __future__ import annotations

import json

import pytest

from server.db.neo4j import Neo4jClient


class _FakeResult:
    def __init__(self, records: list[dict[str, object]]):
        self._records = records

    async def data(self) -> list[dict[str, object]]:
        return self._records


class _FakeSession:
    def __init__(self, records: list[dict[str, object]]):
        self._records = records
        self.last_query: str | None = None
        self.last_params: dict[str, object] | None = None

    async def __aenter__(self) -> "_FakeSession":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def run(self, query: str, **params):
        self.last_query = query
        self.last_params = params
        return _FakeResult(self._records)


class _FakeDriver:
    def __init__(self, records: list[dict[str, object]]):
        self._records = records
        self.session_obj = _FakeSession(records)

    def session(self, database: str | None = None) -> _FakeSession:
        _ = database
        return self.session_obj


@pytest.mark.asyncio
async def test_graph_search_scoring_and_metadata() -> None:
    client = Neo4jClient(uri="bolt://fake", user="neo4j", password="test")

    records = [
        {
            "entity_id": "e1",
            "file_path": "src/foo.py",
            "properties_json": json.dumps({"start_line": 10, "end_line": 20}),
            "name": "Foo",
            "hops": 0,
            "direct_match": True,
        },
        {
            "entity_id": "e2",
            "file_path": "src/bar.py",
            "properties_json": json.dumps({"start_line": 1, "end_line": 1}),
            "name": "Bar",
            "hops": 2,
            "direct_match": False,
        },
    ]

    # Inject a fake driver so we never connect to Neo4j.
    client._driver = _FakeDriver(records)  # type: ignore[assignment]

    results = await client.graph_search(repo_id="test-corpus", query="Foo", max_hops=2, top_k=10)
    assert len(results) == 2

    top = results[0]
    tail = results[1]

    assert top.source == "graph"
    assert top.file_path == "src/foo.py"
    assert top.start_line == 10
    assert top.end_line == 20
    assert top.metadata.get("entity_id") == "e1"
    assert top.metadata.get("hops") == 0
    assert top.metadata.get("direct_match") is True

    assert tail.metadata.get("hops") == 2
    assert tail.metadata.get("direct_match") is False

    # Deterministic hop decay: closer hits should score higher.
    assert top.score > tail.score

    # Ensure Cypher params include tokens + max_hops for deterministic behavior.
    session = client._driver.session_obj  # type: ignore[attr-defined]
    assert session.last_params is not None
    assert session.last_params.get("repo_id") == "test-corpus"
    assert session.last_params.get("max_hops") == 2
    assert "tokens" in session.last_params

