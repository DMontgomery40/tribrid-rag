# Graph Search (Neo4j)

TriBridRAG’s **graph search leg** uses Neo4j to model **entities** (symbols) and **relationships** (edges) extracted from code. This enables “Graph RAG”: retrieval driven by *structure* (who calls what, what imports what, what contains what), not just lexical overlap (sparse) or semantic similarity (dense).

This page documents the Neo4j integration points, configuration (**Pydantic is the law**), and the Cypher patterns we use/expect to use.

!!! note "Tri-brid architecture context"
    Graph search is the **third leg** in TriBridRAG’s tri-brid fusion:
    
    - **Dense**: pgvector (PostgreSQL)
    - **Sparse**: PostgreSQL Full-Text Search / BM25
    - **Graph**: Neo4j (entities + relationships + communities)

    Results from all three legs are fused via **RRF** or **weighted scoring**. See [Fusion (RRF vs Weighted)](./fusion.md).

---

## Why graphs for code search (Graph RAG approach)

Codebases are inherently relational:

- A function is relevant because it is **called by** the entrypoint you searched for.
- A class is relevant because it is **inherited by** the type you’re debugging.
- A module is relevant because it is **imported by** the file you’re editing.
- A chunk is relevant because it **contains** the symbol that matches your query.

Dense and sparse retrieval are great at finding *matching text*, but they can miss “one-hop-away” context that is crucial for correct answers. Graph RAG fills that gap by:

- **Expanding around matched entities** (neighbors within N hops)
- **Surfacing structural context** (call chains, import graphs, containment)
- **Providing community-level grouping** (clusters of related symbols)

!!! tip "When graph search shines"
    Graph search is most valuable for:
    
    - “Where is this function called?”
    - “What depends on this module?”
    - “What is the lifecycle / flow through these components?”
    - “Show me related code around symbol X”

---

## Architecture overview

```mermaid
flowchart LR
  Q[User Query] --> GR[GraphRetriever]
  GR --> NC[Neo4jClient]
  NC --> N4J[(Neo4j)]

  subgraph GraphIndexing[Indexing / Graph Build]
    GB[GraphBuilder] -->|extract_entities| E[Entity nodes]
    GB -->|extract_relationships| R[Relationship edges]
    GB -->|detect_communities| C[Community nodes/labels]
  end

  GraphIndexing --> N4J

  N4J -->|graph_search| M[ChunkMatch[]]
  M --> F[Fusion (RRF / Weighted)]
  F --> Final[Final ranked chunks]
```

Related pages:

- [Tri-brid Retrieval Overview](./retrieval_overview.md)
- [Fusion (RRF vs Weighted)](./fusion.md)
- [Configuration Model (Pydantic)](./configuration.md)

---

## Code entry points

### Neo4j client

`server/db/neo4j.py` defines the async Neo4j client wrapper:

- Connection lifecycle: `connect()`, `disconnect()`
- CRUD operations for entities/relationships/communities
- Search: `graph_search(...) -> list[ChunkMatch]`
- Debug/ops: `execute_cypher(...)`
- Stats: `get_graph_stats(...)`

```python linenums="1" hl_lines="1 6 24"
from neo4j import AsyncGraphDatabase

from server.models.graph import Community, Entity, GraphStats, Relationship
from server.models.retrieval import ChunkMatch


class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str):
        self.uri = uri
        self.user = user
        self.password = password
        self._driver = None

    async def connect(self) -> None:
        self._driver = AsyncGraphDatabase.driver(self.uri, auth=(self.user, self.password))

    async def disconnect(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None

    async def graph_search(self, repo_id: str, query: str, max_hops: int, top_k: int) -> list[ChunkMatch]:
        raise NotImplementedError
```

!!! warning "Implementation status"
    Many methods are currently `NotImplementedError`. This page documents the intended behavior and the configuration contract so the implementation can be completed consistently.

### Retriever integration

`server/retrieval/graph.py` wires Neo4j into the retrieval layer:

```python linenums="1" hl_lines="6 12"
from server.db.neo4j import Neo4jClient
from server.indexing.embedder import Embedder
from server.models.config import GraphSearchConfig
from server.models.retrieval import ChunkMatch


class GraphRetriever:
    def __init__(self, neo4j: Neo4jClient, embedder: Embedder):
        self.neo4j = neo4j
        self.embedder = embedder

    async def search(self, repo_id: str, query: str, config: GraphSearchConfig) -> list[ChunkMatch]:
        return await self.neo4j.graph_search(repo_id, query, config.max_hops, config.top_k)
```

---

## Entities: what we extract and store

Entities are the “things” in the code graph: symbols and structural units. The canonical list is configured in **Pydantic** via `GraphStorageConfig.entity_types`.

From `server/models/tribrid_config_model.py`:

```python linenums="1" hl_lines="1 25 26"
class GraphStorageConfig(BaseModel):
    """Configuration for Neo4j graph storage and traversal."""

    entity_types: List[str] = Field(
        default=["function", "class", "module", "variable", "import"],
        description="Entity types to extract and store in graph"
    )
```

Entity types (default):

- `function`
- `class`
- `module`
- `variable`
- `import`

!!! note "Entity granularity vs chunks"
    Graph nodes represent *symbols/units*, while retrieval ultimately returns **chunks** (`ChunkMatch`). The graph layer typically maps:
    
    - query → entity candidates (by name/type/metadata)
    - entity candidates → related entities (traversal)
    - entities → chunk IDs (where the entity is defined/used)

### Suggested Neo4j node model (recommended)

While the exact schema is not yet implemented in `Neo4jClient`, the following conventions keep queries fast and predictable:

- `(:Repo {repo_id})` (optional anchor)
- `(:Entity {id, repo_id, name, type, file_path, chunk_id, ...})`
- `(:Chunk {id, repo_id, file_path, start_line, end_line, ...})` (optional but useful)
- `(:Community {repo_id, level, community_id, algorithm, ...})` (optional)

---

## Relationships: what edges we store

Relationships represent how entities connect. The canonical list is configured in **Pydantic** via `GraphStorageConfig.relationship_types`.

```python linenums="1" hl_lines="1 18 19"
class GraphStorageConfig(BaseModel):
    relationship_types: List[str] = Field(
        default=["calls", "imports", "inherits", "contains", "references"],
        description="Relationship types to extract"
    )
```

Relationship types (default):

- `calls` — function/method invocation edges
- `imports` — module import edges
- `inherits` — class inheritance edges
- `contains` — containment edges (module→class, class→method, file→symbol)
- `references` — general symbol reference edges (fallback when call/import/inherit is unknown)

!!! tip "Keep relationship types small and stable"
    A small, stable edge taxonomy makes traversal and scoring easier. If you add new relationship types, update:
    
    - `GraphStorageConfig.relationship_types`
    - graph builder extraction logic
    - Cypher traversal patterns (filtering by relationship type)

---

## Community detection (Louvain / Label Propagation)

Communities are clusters of densely connected entities. They’re useful for:

- grouping related subsystems
- boosting results that belong to the same “topic cluster”
- summarizing neighborhoods for context expansion

Configuration lives in `GraphStorageConfig`:

```python linenums="1" hl_lines="1 9 14 19"
class GraphStorageConfig(BaseModel):
    include_communities: bool = Field(
        default=True,
        description="Include community detection in graph analysis"
    )

    community_algorithm: Literal["louvain", "label_propagation"] = Field(
        default="louvain",
        description="Community detection algorithm"
    )
```

### Algorithms

- **Louvain**
  - Optimizes modularity; typically produces higher-quality clusters.
  - Often more stable for larger graphs.
- **Label propagation**
  - Fast and simple; good for quick clustering.
  - Can be less stable across runs depending on implementation details.

!!! note "Neo4j GDS dependency"
    Community detection is typically implemented via Neo4j Graph Data Science (GDS) procedures (e.g., `gds.louvain.*`, `gds.labelPropagation.*`). If GDS is not available, set `include_communities=false` to avoid runtime failures.

---

## Configuration: `GraphStorageConfig` (Pydantic is the law)

All graph storage and traversal tuning flows from `server/models/tribrid_config_model.py`. Do not introduce ad-hoc environment variables or hand-maintained TypeScript types.

### Parameters

`neo4j_uri`
: Neo4j connection URI (e.g., `bolt://localhost:7687`).

`neo4j_user`
: Neo4j username.

`neo4j_password`
: Neo4j password. Prefer injecting via environment variable and loading into `tribrid_config.json`.

`neo4j_database`
: Neo4j database name (default: `neo4j`).

`max_hops`
: Maximum traversal depth for graph search (default: `2`, allowed: `1..5`).

`include_communities`
: Whether to run community detection and store community metadata.

`community_algorithm`
: Community detection algorithm: `louvain` or `label_propagation`.

`entity_types`
: Entity types to extract/store.

`relationship_types`
: Relationship types to extract/store.

`graph_search_top_k`
: Number of results returned from graph traversal (default: `30`).

!!! warning "Single source of truth"
    `GraphStorageConfig` is the contract. If you need a new graph feature, add it here first, then regenerate TypeScript types (never hand-write them). See [Configuration Model (Pydantic)](./configuration.md).

??? note "Config snippet example (tribrid_config.json)"
    ```json linenums="1"
    {
      "graph_storage": {
        "neo4j_uri": "bolt://localhost:7687",
        "neo4j_user": "neo4j",
        "neo4j_password": "${NEO4J_PASSWORD}",
        "neo4j_database": "neo4j",
        "max_hops": 2,
        "include_communities": true,
        "community_algorithm": "louvain",
        "entity_types": ["function", "class", "module", "variable", "import"],
        "relationship_types": ["calls", "imports", "inherits", "contains", "references"],
        "graph_search_top_k": 30
      }
    }
    ```

---

## Traversal depth: configuring `max_hops`

Traversal depth controls how far we expand from initial matches.

- `max_hops=1`: direct neighbors only (high precision, lower recall)
- `max_hops=2`: neighbors-of-neighbors (balanced; default)
- `max_hops>=3`: can explode result set; use carefully

In retrieval, `GraphRetriever.search()` passes `config.max_hops` directly to `Neo4jClient.graph_search(...)`.

```python linenums="1" hl_lines="3"
async def search(self, repo_id: str, query: str, config: GraphSearchConfig) -> list[ChunkMatch]:
    return await self.neo4j.graph_search(repo_id, query, config.max_hops, config.top_k)
```

!!! danger "Graph blow-up risk"
    Increasing `max_hops` increases the branching factor dramatically on dense graphs (especially with `references`). Keep `max_hops` small and prefer filtering by relationship type and/or node type.

---

## Cypher query patterns (expected)

`Neo4jClient.execute_cypher(query, params)` is the escape hatch for debugging and operational queries. The production path is `graph_search(...)`, which should be implemented using a small set of predictable Cypher patterns.

Below are the recommended patterns TriBridRAG should use.

### 1) Entity lookup by name (seed selection)

Goal: find candidate entities matching the query string (exact, prefix, or fuzzy).

```cypher
MATCH (e:Entity {repo_id: $repo_id})
WHERE toLower(e.name) CONTAINS toLower($q)
  AND ($entity_types IS NULL OR e.type IN $entity_types)
RETURN e
ORDER BY e.name
LIMIT $seed_k
```

Notes:

- In practice, you’ll want indexes/constraints on `(repo_id, name)` and possibly full-text indexes for `Entity.name`.
- Seed selection should be conservative; traversal expands recall.

### 2) Bounded traversal from seeds (N hops)

Goal: expand from seed entities across allowed relationship types.

```cypher
MATCH (seed:Entity {repo_id: $repo_id})
WHERE seed.id IN $seed_ids

MATCH p = (seed)-[r*1..$max_hops]-(nbr:Entity {repo_id: $repo_id})
WHERE ALL(rel IN r WHERE type(rel) IN $rel_types)
RETURN nbr, length(p) AS hops
ORDER BY hops ASC
LIMIT $top_k
```

Notes:

- Use undirected `-(...)-` if you want “relatedness” regardless of direction.
- Use directed traversal if you want semantics (e.g., `calls` direction).

### 3) Map entities to chunks (return `ChunkMatch`)

Goal: convert graph hits into retrievable chunk IDs.

Common approaches:

- store `chunk_id` directly on `Entity`
- or connect `(:Entity)-[:DEFINED_IN]->(:Chunk)` / `(:Entity)-[:MENTIONED_IN]->(:Chunk)`

Example with `chunk_id` property:

```cypher
MATCH (e:Entity {repo_id: $repo_id})
WHERE e.id IN $entity_ids AND e.chunk_id IS NOT NULL
RETURN e.chunk_id AS chunk_id, count(*) AS support
ORDER BY support DESC
LIMIT $top_k
```

Example with explicit chunk nodes:

```cypher
MATCH (e:Entity {repo_id: $repo_id})-[:DEFINED_IN|MENTIONED_IN]->(c:Chunk {repo_id: $repo_id})
WHERE e.id IN $entity_ids
RETURN c.id AS chunk_id, count(*) AS support
ORDER BY support DESC
LIMIT $top_k
```

### 4) Community-aware boosting (optional)

If communities are enabled, we can boost entities/chunks that share a community with the seeds.

```cypher
MATCH (seed:Entity {repo_id: $repo_id})-[:IN_COMMUNITY]->(comm:Community {repo_id: $repo_id})
WHERE seed.id IN $seed_ids

MATCH (e:Entity {repo_id: $repo_id})-[:IN_COMMUNITY]->(comm)
RETURN e, count(comm) AS shared_communities
ORDER BY shared_communities DESC
LIMIT $top_k
```

!!! note "Scoring strategy"
    Graph search typically yields a *support score* (e.g., number of paths, shared communities, inverse hop distance). That score becomes the graph leg’s contribution during tri-brid fusion. See [Fusion (RRF vs Weighted)](./fusion.md).

---

## Implementation checklist (what `Neo4jClient` should do)

Even though methods are currently stubbed, the intended responsibilities are clear:

1. **Upsert entities** (`upsert_entity`, `upsert_entities`)
   - Merge on stable IDs (e.g., `repo_id + entity_id`)
   - Set/update name/type/file_path/chunk_id metadata

2. **Upsert relationships** (`upsert_relationship`, `upsert_relationships`)
   - Merge edges between entity IDs
   - Store relationship type and optional metadata (call site, line, etc.)

3. **Community detection** (`detect_communities`, `get_communities`)
   - Run configured algorithm when `include_communities=true`
   - Persist community membership for traversal/boosting

4. **Graph search** (`graph_search`)
   - Seed entities from query
   - Traverse up to `max_hops`
   - Map entities → chunk IDs
   - Return `ChunkMatch[]` (with graph-derived score + provenance)

5. **Stats** (`get_graph_stats`)
   - Count entities, relationships, communities per repo

!!! warning "Keep graph search deterministic"
    For stable evaluation and debugging, prefer deterministic ordering:
    
    - order by hop distance, then support count, then stable IDs
    - avoid nondeterministic procedures unless explicitly controlled

---

## Troubleshooting

!!! tip "Validate config first"
    If Neo4j connectivity fails, check `graph_storage.neo4j_uri`, `neo4j_user`, and `neo4j_password` in `tribrid_config.json`. Because Pydantic validates ranges/types, most failures here are *runtime connectivity* rather than schema issues.

!!! warning "Database selection"
    `GraphStorageConfig.neo4j_database` exists, but `Neo4jClient.connect()` currently does not select a database explicitly. When implementing queries, ensure sessions target the configured database.

---

## Next steps / related work

- Implement `GraphBuilder.build_graph()` to:
  - extract entities from chunks
  - infer relationships
  - upsert into Neo4j
  - optionally run community detection

- Implement `GraphRetriever.expand_context()` to:
  - take initial chunk IDs
  - find entities inside those chunks
  - expand neighbors within `max_hops`
  - return additional `ChunkMatch` context candidates

See also:

- [Indexing Pipeline](./indexing.md)
- [Retrieval Pipeline](./retrieval_overview.md)
- [Fusion (RRF vs Weighted)](./fusion.md)
- [Configuration Model (Pydantic)](./configuration.md)