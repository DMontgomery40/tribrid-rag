from __future__ import annotations

import json
import os
import re
from collections import defaultdict
from collections.abc import Iterable
from typing import Any, Literal, cast

from neo4j import AsyncDriver, AsyncGraphDatabase

from server.models.graph import Community, Entity, GraphStats, Relationship
from server.models.retrieval import ChunkMatch

EntityType = Literal["function", "class", "module", "variable", "concept"]
RelationshipType = Literal["calls", "imports", "inherits", "contains", "references", "related_to"]


class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str, database: str | None = None):
        self.uri = uri
        self.user = user
        self.password = password
        self.database = database or "neo4j"
        self._driver: AsyncDriver | None = None

    async def connect(self) -> None:
        uri = os.getenv("NEO4J_URI") or self.uri
        user = os.getenv("NEO4J_USER") or self.user
        password = os.getenv("NEO4J_PASSWORD") or self.password
        self._driver = AsyncGraphDatabase.driver(uri, auth=(user, password))

    async def disconnect(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None

    # Entity operations
    async def upsert_entity(self, repo_id: str, entity: Entity) -> None:
        await self.upsert_entities(repo_id, [entity])

    async def upsert_entities(self, repo_id: str, entities: list[Entity]) -> int:
        if not entities:
            return 0
        driver = self._require_driver()

        payload = []
        for e in entities:
            payload.append(
                {
                    "entity_id": e.entity_id,
                    "name": e.name,
                    "entity_type": e.entity_type,
                    "file_path": e.file_path,
                    "description": e.description,
                    "properties_json": json.dumps(e.properties or {}),
                }
            )

        query = """
        UNWIND $entities AS e
        MERGE (n:Entity {repo_id: $repo_id, entity_id: e.entity_id})
        SET n.name = e.name,
            n.entity_type = e.entity_type,
            n.file_path = e.file_path,
            n.description = e.description,
            n.properties_json = e.properties_json;
        """

        async with driver.session(database=self.database) as session:
            await session.run(query, repo_id=repo_id, entities=payload)
        return len(entities)

    async def get_entity(self, entity_id: str) -> Entity | None:
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            row = await session.run(
                """
                MATCH (n:Entity {entity_id: $entity_id})
                RETURN n.repo_id AS repo_id,
                       n.entity_id AS entity_id,
                       n.name AS name,
                       n.entity_type AS entity_type,
                       n.file_path AS file_path,
                       n.description AS description,
                       n.properties_json AS properties_json
                LIMIT 1;
                """,
                entity_id=entity_id,
            )
            rec = await row.single()
        if not rec:
            return None
        return _entity_from_record(rec)

    async def list_entities(self, repo_id: str, entity_type: str | None, limit: int) -> list[Entity]:
        driver = self._require_driver()
        where = "WHERE n.repo_id = $repo_id"
        params: dict[str, Any] = {"repo_id": repo_id, "limit": int(limit)}
        if entity_type:
            where += " AND n.entity_type = $entity_type"
            params["entity_type"] = entity_type
        query = f"""
        MATCH (n:Entity)
        {where}
        RETURN n.repo_id AS repo_id,
               n.entity_id AS entity_id,
               n.name AS name,
               n.entity_type AS entity_type,
               n.file_path AS file_path,
               n.description AS description,
               n.properties_json AS properties_json
        LIMIT $limit;
        """
        async with driver.session(database=self.database) as session:
            res = await session.run(query, **params)
            records = await res.data()
        return [_entity_from_mapping(r) for r in records]

    async def delete_entities(self, repo_id: str) -> int:
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            result = await session.run(
                """
                MATCH (n:Entity {repo_id: $repo_id})
                WITH n, count(n) AS n_count
                DETACH DELETE n
                RETURN n_count AS n_count;
                """,
                repo_id=repo_id,
            )
            rec = await result.single()
        return int(rec["n_count"] if rec else 0)

    # Relationship operations
    async def upsert_relationship(self, repo_id: str, rel: Relationship) -> None:
        await self.upsert_relationships(repo_id, [rel])

    async def upsert_relationships(self, repo_id: str, rels: list[Relationship]) -> int:
        if not rels:
            return 0
        driver = self._require_driver()

        allowed = {
            "calls",
            "imports",
            "inherits",
            "contains",
            "references",
            "related_to",
        }
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r in rels:
            rel_type = str(r.relation_type)
            if rel_type not in allowed:
                continue
            grouped[rel_type].append(
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "weight": float(r.weight or 0.0),
                    "properties_json": json.dumps(r.properties or {}),
                }
            )

        async with driver.session(database=self.database) as session:
            for rel_type, payload in grouped.items():
                # Relationship type must be literal in Cypher; rel_type is validated against allowed.
                query = f"""
                UNWIND $rels AS r
                MATCH (a:Entity {{repo_id: $repo_id, entity_id: r.source_id}})
                MATCH (b:Entity {{repo_id: $repo_id, entity_id: r.target_id}})
                MERGE (a)-[rel:{rel_type}]->(b)
                SET rel.weight = r.weight,
                    rel.properties_json = r.properties_json;
                """
                await session.run(query, repo_id=repo_id, rels=payload)
        return sum(len(v) for v in grouped.values())

    async def get_relationships(self, entity_id: str) -> list[Relationship]:
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            res = await session.run(
                """
                MATCH (a:Entity {entity_id: $entity_id})-[r]->(b:Entity)
                RETURN a.entity_id AS source_id,
                       b.entity_id AS target_id,
                       type(r) AS relation_type,
                       coalesce(r.weight, 1.0) AS weight,
                       r.properties_json AS properties_json;
                """,
                entity_id=entity_id,
            )
            records = await res.data()
        out: list[Relationship] = []
        allowed: set[str] = {
            "calls",
            "imports",
            "inherits",
            "contains",
            "references",
            "related_to",
        }
        for r in records:
            props = {}
            if r.get("properties_json"):
                try:
                    props = json.loads(r["properties_json"])
                except Exception:
                    props = {}
            rel_type = str(r.get("relation_type") or "")
            if rel_type not in allowed:
                continue
            out.append(
                Relationship(
                    source_id=str(r["source_id"]),
                    target_id=str(r["target_id"]),
                    relation_type=cast(RelationshipType, rel_type),
                    weight=float(r.get("weight") or 1.0),
                    properties=props,
                )
            )
        return out

    # Community operations
    async def detect_communities(self, repo_id: str) -> list[Community]:
        # Heuristic community detection (works without GDS): group by top-level directory.
        entities = await self.list_entities(repo_id, entity_type=None, limit=100000)
        by_group: dict[str, list[str]] = defaultdict(list)
        for e in entities:
            fp = (e.file_path or "").replace("\\", "/")
            if not fp:
                continue
            group = fp.split("/", 1)[0] if "/" in fp else "(root)"
            by_group[group].append(e.entity_id)

        communities: list[Community] = []
        for group, member_ids in sorted(by_group.items(), key=lambda t: (-len(t[1]), t[0])):
            community_id = f"{repo_id}:{group}"
            communities.append(
                Community(
                    community_id=community_id,
                    name=group,
                    summary=f"Entities in '{group}'",
                    member_ids=member_ids,
                    level=0,
                )
            )

        await self._store_communities(repo_id, communities)
        return communities

    async def get_communities(self, repo_id: str, level: int | None) -> list[Community]:
        driver = self._require_driver()
        where = "WHERE c.repo_id = $repo_id"
        params: dict[str, Any] = {"repo_id": repo_id}
        if level is not None:
            where += " AND c.level = $level"
            params["level"] = int(level)

        query = f"""
        MATCH (c:Community)
        {where}
        OPTIONAL MATCH (e:Entity {{repo_id: $repo_id}})-[:IN_COMMUNITY]->(c)
        WITH c, collect(e.entity_id) AS member_ids
        RETURN c.community_id AS community_id,
               c.name AS name,
               c.summary AS summary,
               c.level AS level,
               member_ids AS member_ids;
        """
        async with driver.session(database=self.database) as session:
            res = await session.run(query, **params)
            records = await res.data()

        out: list[Community] = []
        for r in records:
            out.append(
                Community(
                    community_id=str(r["community_id"]),
                    name=str(r["name"]),
                    summary=str(r["summary"] or ""),
                    member_ids=[str(x) for x in (r.get("member_ids") or [])],
                    level=int(r.get("level") or 0),
                )
            )
        return out

    # Search
    async def graph_search(self, repo_id: str, query: str, max_hops: int, top_k: int) -> list[ChunkMatch]:
        if not query.strip() or top_k <= 0:
            return []
        driver = self._require_driver()

        # Tokenize query for deterministic matching (no LLM).
        tokens = [t.lower() for t in re.findall(r"[A-Za-z_][A-Za-z0-9_]{1,63}", query)]
        # Fall back to whole-string match if we got no tokens (e.g. symbols-only queries).
        if not tokens:
            tokens = [query.strip().lower()]
        # Cap token count to keep Cypher params small and stable.
        tokens = list(dict.fromkeys(tokens))[:8]

        max_hops = int(max(0, max_hops or 0))
        cypher = """
        MATCH (seed:Entity {repo_id: $repo_id})
        WHERE any(tok IN $tokens WHERE toLower(seed.name) CONTAINS tok)
        MATCH p = (seed)-[*0..$max_hops]-(e:Entity {repo_id: $repo_id})
        WITH
          e,
          min(length(p)) AS hops,
          any(tok IN $tokens WHERE toLower(e.name) CONTAINS tok) AS direct_match
        RETURN DISTINCT
          e.entity_id AS entity_id,
          e.file_path AS file_path,
          e.properties_json AS properties_json,
          e.name AS name,
          hops AS hops,
          direct_match AS direct_match
        ORDER BY direct_match DESC, hops ASC, name ASC
        LIMIT $limit;
        """

        async with driver.session(database=self.database) as session:
            res = await session.run(
                cypher,
                repo_id=repo_id,
                tokens=tokens,
                max_hops=max_hops,
                limit=int(top_k),
            )
            records = await res.data()

        out: list[ChunkMatch] = []
        for r in records:
            fp = r.get("file_path")
            props: dict[str, Any] = {}
            if r.get("properties_json"):
                try:
                    props = json.loads(r["properties_json"])
                except Exception:
                    props = {}
            hops = int(r.get("hops") or 0)
            direct_match = bool(r.get("direct_match"))
            # Deterministic score: direct matches outrank neighbors; deeper hops decay.
            base = 1.0 if direct_match else 0.7
            score = float(base / float(1 + max(0, hops)))
            # Graph returns entity-level hits; chunk hydration happens in higher-level retriever.
            out.append(
                ChunkMatch(
                    chunk_id=str(r.get("entity_id")),
                    content=str(r.get("name") or ""),
                    file_path=str(fp) if fp is not None else "",
                    start_line=int(props.get("start_line") or 0),
                    end_line=int(props.get("end_line") or 0),
                    language=None,
                    score=score,
                    source="graph",
                    metadata={
                        "entity_id": str(r.get("entity_id")),
                        "entity_name": str(r.get("name") or ""),
                        "hops": hops,
                        "direct_match": direct_match,
                        "tokens": tokens,
                    },
                )
            )
        return out

    async def execute_cypher(self, query: str, params: dict[str, Any] | None) -> list[dict[str, Any]]:
        driver = self._require_driver()
        p = params or {}

        # Guardrail: only allow read-only statements from this debug endpoint.
        lowered = query.strip().lower()
        banned = ("create ", "merge ", "delete ", "set ", "drop ", "call dbms", "call gds")
        if any(b in lowered for b in banned):
            raise ValueError("Only read-only Cypher is allowed (MATCH/RETURN).")

        async with driver.session(database=self.database) as session:
            res = await session.run(query, **p)
            records: list[dict[str, Any]] = await res.data()
        return records

    # Stats
    async def get_graph_stats(self, repo_id: str) -> GraphStats:
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            counts = await session.run(
                """
                MATCH (e:Entity {repo_id: $repo_id})
                WITH count(e) AS total_entities
                MATCH (a:Entity {repo_id: $repo_id})-[r]->(b:Entity {repo_id: $repo_id})
                WITH total_entities, count(r) AS total_relationships
                MATCH (c:Community {repo_id: $repo_id})
                RETURN total_entities, total_relationships, count(c) AS total_communities;
                """,
                repo_id=repo_id,
            )
            rec = await counts.single()

            entity_breakdown_res = await session.run(
                """
                MATCH (e:Entity {repo_id: $repo_id})
                RETURN e.entity_type AS t, count(e) AS n;
                """,
                repo_id=repo_id,
            )
            entity_rows = await entity_breakdown_res.data()

            rel_breakdown_res = await session.run(
                """
                MATCH (:Entity {repo_id: $repo_id})-[r]->(:Entity {repo_id: $repo_id})
                RETURN type(r) AS t, count(r) AS n;
                """,
                repo_id=repo_id,
            )
            rel_rows = await rel_breakdown_res.data()

        entity_breakdown = {str(r["t"]): int(r["n"]) for r in entity_rows}
        rel_breakdown = {str(r["t"]): int(r["n"]) for r in rel_rows}
        return GraphStats(
            repo_id=repo_id,
            total_entities=int(rec["total_entities"] if rec else 0),
            total_relationships=int(rec["total_relationships"] if rec else 0),
            total_communities=int(rec["total_communities"] if rec else 0),
            entity_breakdown=entity_breakdown,
            relationship_breakdown=rel_breakdown,
        )

    async def delete_graph(self, repo_id: str) -> None:
        """Delete all graph data (entities, rels, communities) for a corpus."""
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            await session.run("MATCH (n {repo_id: $repo_id}) DETACH DELETE n;", repo_id=repo_id)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _require_driver(self) -> AsyncDriver:
        if self._driver is None:
            raise RuntimeError("Neo4j driver is not connected. Call connect() first.")
        return self._driver

    async def _store_communities(self, repo_id: str, communities: Iterable[Community]) -> None:
        driver = self._require_driver()
        async with driver.session(database=self.database) as session:
            # Clear existing communities + membership edges
            await session.run(
                """
                MATCH (c:Community {repo_id: $repo_id})
                DETACH DELETE c;
                """,
                repo_id=repo_id,
            )

            comm_payload = [
                {
                    "community_id": c.community_id,
                    "name": c.name,
                    "summary": c.summary,
                    "level": int(c.level),
                    "member_ids": list(c.member_ids),
                }
                for c in communities
            ]

            await session.run(
                """
                UNWIND $communities AS c
                MERGE (comm:Community {repo_id: $repo_id, community_id: c.community_id})
                SET comm.name = c.name,
                    comm.summary = c.summary,
                    comm.level = c.level;
                """,
                repo_id=repo_id,
                communities=comm_payload,
            )

            await session.run(
                """
                UNWIND $communities AS c
                MATCH (comm:Community {repo_id: $repo_id, community_id: c.community_id})
                UNWIND c.member_ids AS mid
                MATCH (e:Entity {repo_id: $repo_id, entity_id: mid})
                MERGE (e)-[:IN_COMMUNITY]->(comm);
                """,
                repo_id=repo_id,
                communities=comm_payload,
            )


def _entity_from_record(record: Any) -> Entity:
    props = {}
    if record.get("properties_json"):
        try:
            props = json.loads(record["properties_json"])
        except Exception:
            props = {}
    return Entity(
        entity_id=str(record["entity_id"]),
        name=str(record["name"]),
        entity_type=_coerce_entity_type(str(record["entity_type"])),
        file_path=str(record["file_path"]) if record.get("file_path") is not None else None,
        description=str(record["description"]) if record.get("description") is not None else None,
        properties=props,
    )


def _entity_from_mapping(mapping: dict[str, Any]) -> Entity:
    props = {}
    if mapping.get("properties_json"):
        try:
            props = json.loads(mapping["properties_json"])
        except Exception:
            props = {}
    return Entity(
        entity_id=str(mapping["entity_id"]),
        name=str(mapping["name"]),
        entity_type=_coerce_entity_type(str(mapping["entity_type"])),
        file_path=str(mapping["file_path"]) if mapping.get("file_path") is not None else None,
        description=str(mapping["description"]) if mapping.get("description") is not None else None,
        properties=props,
    )


def _coerce_entity_type(value: str) -> EntityType:
    allowed: set[str] = {"function", "class", "module", "variable", "concept"}
    if value in allowed:
        return cast(EntityType, value)
    return "concept"
