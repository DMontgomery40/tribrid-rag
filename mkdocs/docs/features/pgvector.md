# Vector Search (pgvector)

TriBridRAG’s dense retrieval leg is implemented on **PostgreSQL + pgvector**, using the same Postgres instance that also powers metadata and (optionally) sparse retrieval. This keeps the system operationally simple while still delivering strong semantic search performance.

!!! note "Tri-brid context"
    Vector search is **one of three retrieval legs** in TriBridRAG (vector + sparse + graph). Results are fused downstream via **RRF** or **weighted scoring**. See also: [Fusion (RRF / Weighted)](./fusion.md), [Sparse Search (FTS/BM25)](./sparse-search.md), and [Graph Search (Neo4j)](./graph-search-neo4j.md).

---

## Where vector search lives in the code

At runtime, vector retrieval is a small, explicit pipeline:

- `VectorRetriever.search()` embeds the query and calls Postgres.
- `PostgresClient.vector_search()` performs the pgvector similarity query.

```python linenums="1" hl_lines="9-14"
from server.db.postgres import PostgresClient
from server.indexing.embedder import Embedder
from server.models.config import VectorSearchConfig
from server.models.retrieval import ChunkMatch


class VectorRetriever:
    def __init__(self, postgres: PostgresClient, embedder: Embedder):
        self.postgres = postgres
        self.embedder = embedder

    async def search(self, repo_id: str, query: str, config: VectorSearchConfig) -> list[ChunkMatch]:
        embedding = await self.embedder.embed(query)
        results = await self.postgres.vector_search(repo_id, embedding, config.top_k)
        if config.similarity_threshold > 0:
            results = [r for r in results if r.score >= config.similarity_threshold]
        return results
```

!!! warning "PostgresClient is the contract"
    `server/db/postgres.py` defines the interface (`upsert_embeddings`, `vector_search`, `delete_embeddings`). The concrete SQL implementation must honor this contract and return `ChunkMatch` objects with a consistent `score` meaning (typically cosine similarity or a normalized distance transform).

---

## Why pgvector (vs a dedicated vector database)

We use **pgvector** because it aligns with TriBridRAG’s architecture goals:

1. **Operational simplicity**
   - One Postgres instance can host:
     - chunk metadata
     - embeddings (pgvector)
     - optional sparse search structures (FTS/BM25-style ranking)
   - Fewer moving parts means fewer failure modes and simpler deployments.

2. **Transactional consistency**
   - Indexing pipelines often need “upsert chunk + upsert embedding + update stats” as a coherent unit.
   - Postgres gives us familiar transactional semantics and tooling.

3. **Good-enough performance with the right index**
   - pgvector supports approximate nearest neighbor (ANN) indexes (notably **HNSW** and **IVFFlat**) that cover most RAG workloads well.

!!! tip "When pgvector is the right choice"
    pgvector is especially strong when you want:
    - a single datastore for retrieval + metadata
    - predictable operations (backups, migrations, monitoring)
    - moderate-to-large corpora with ANN indexing

---

## Index types: HNSW vs IVFFlat

pgvector supports multiple index strategies. The two you should care about for RAG are **HNSW** and **IVFFlat**.

### HNSW (Hierarchical Navigable Small World)

**Best for:** low-latency queries, high recall, frequently queried corpora.

- Pros:
  - Typically excellent recall/latency tradeoff
  - No “training” step like IVF clustering
  - Works well as your corpus grows incrementally
- Cons:
  - Higher memory and index build cost than IVFFlat
  - More write overhead during indexing

**Typical SQL (conceptual):**
- Distance ops: cosine (`vector_cosine_ops`) or L2 (`vector_l2_ops`)
- Index: `USING hnsw (embedding vector_cosine_ops)`

### IVFFlat (Inverted File Flat)

**Best for:** large corpora where you can tolerate slightly lower recall or you want cheaper indexing.

- Pros:
  - Often smaller/faster to build than HNSW
  - Good performance when tuned (`lists`, `probes`)
- Cons:
  - Requires choosing clustering parameters (`lists`)
  - Query-time recall depends heavily on `probes`
  - Works best when the dataset is relatively stable (or you periodically rebuild)

**Typical SQL (conceptual):**
- Index: `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- Query tuning: `SET ivfflat.probes = 10`

!!! warning "Pick one per workload"
    HNSW and IVFFlat are not interchangeable defaults. If you don’t know which to pick:
    - start with **HNSW** for developer-facing interactive search
    - consider **IVFFlat** for very large corpora or constrained environments

??? note "Click to expand: recommended starting points"
    - HNSW:
      - Use cosine distance for embeddings that are approximately normalized.
      - Start with moderate `m` and `ef_construction`; tune later.
    - IVFFlat:
      - Start with `lists ≈ sqrt(N)` (rule of thumb).
      - Start with `probes` around `sqrt(lists)` and tune for recall vs latency.

---

## Configuration (Pydantic is the law)

All tunable configuration flows from `server/models/tribrid_config_model.py`. Do not hand-roll config parsing; do not hand-write TypeScript types—those are generated from Pydantic.

### IndexingConfig (pgvector-related fields)

These fields live under `TriBridConfigRoot.indexing`.

```python linenums="1" hl_lines="6-21"
class IndexingConfig(BaseModel):
    """Indexing and vector storage configuration."""

    postgres_url: str = Field(
        default="http://127.0.0.1:6333",
        description="PostgreSQL pgvector URL"
    )
    table_name: str = Field(
        default="code_chunks_{repo}",
        description="pgvector table name template"
    )
    collection_suffix: str = Field(
        default="default",
        description="Collection suffix for multi-index scenarios"
    )
    indexing_batch_size: int = Field(default=100, ge=10, le=1000)
    indexing_workers: int = Field(default=4, ge=1, le=16)
    skip_dense: int = Field(default=0, ge=0, le=1, description="Skip dense vector indexing")
```

Parameter reference (definition list):

postgres_url
: Connection string/URL for Postgres hosting pgvector.  
  **Note:** despite the name, this must be a Postgres connection target in your deployment. Ensure it matches what `asyncpg.create_pool()` expects in `PostgresClient.connect()`.

table_name
: Template for the per-repo chunk table. The `{repo}` token is substituted with the repository identifier.

collection_suffix
: Suffix for multi-index scenarios (e.g., multiple embedding models or environments). Use this to avoid collisions.

indexing_batch_size
: Batch size for embedding upserts. Larger batches improve throughput but increase memory pressure.

indexing_workers
: Parallelism for indexing. Tune based on CPU, embedding provider throughput, and Postgres capacity.

skip_dense
: Set to `1` to disable dense indexing entirely (vector leg off). Useful for debugging or sparse-only runs.

!!! danger "Config correctness is enforced"
    Pydantic validates ranges and types at load time. If you need a new pgvector tuning knob (e.g., HNSW `m`), add it to `IndexingConfig` (or a dedicated `VectorIndexConfig`) and regenerate TypeScript types from the Pydantic schema.

---

## Embedding dimensions & supported models

Vector search quality and correctness depend on embedding configuration. Dimensions must match the stored vectors.

### EmbeddingConfig essentials

```python linenums="1" hl_lines="6-20 55-63"
class EmbeddingConfig(BaseModel):
    embedding_type: str = Field(default="openai")
    embedding_model: str = Field(default="text-embedding-3-large")
    embedding_dim: int = Field(default=3072, ge=128, le=4096)

    voyage_model: str = Field(default="voyage-code-3")
    embedding_model_local: str = Field(default="all-MiniLM-L6-v2")

    @field_validator('embedding_dim')
    @classmethod
    def validate_dim_matches_model(cls, v):
        common_dims = [128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096]
        if v not in common_dims:
            raise ValueError(f'Uncommon embedding dimension: {v}. Expected one of {common_dims}')
        return v
```

What this means in practice:

- `embedding_dim` must match the actual output dimension of your embedding model.
- TriBridRAG validates that the dimension is one of a known set of common sizes.
- If you change `embedding_model`, you must ensure:
  - the index schema uses the same dimension
  - existing stored vectors are rebuilt (or stored in a separate table/collection suffix)

!!! warning "Dimension mismatch will break retrieval"
    If the table column is `vector(3072)` but you embed to 1536 (or vice versa), inserts and/or queries will fail. Treat embedding dimension changes as a schema migration + full reindex.

---

## Query examples (SQL + Python)

### 1) SQL: cosine similarity top-k (conceptual)

Assuming a table like:

- `chunk_id text primary key`
- `repo_id text`
- `content text`
- `embedding vector(3072)`

You can query:

```sql linenums="1"
SELECT
  chunk_id,
  1 - (embedding <=> $1::vector) AS score
FROM code_chunks_myrepo
WHERE repo_id = $2
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

Notes:

- `<=>` is commonly used for cosine distance in pgvector (operator depends on your pgvector version/operator class).
- We often convert distance to similarity via `1 - distance` to produce a “higher is better” `score`.

!!! note "Score semantics"
    `VectorRetriever` filters by `config.similarity_threshold` assuming **higher score is better**. Ensure your `vector_search()` implementation returns a score aligned with that expectation.

### 2) Python: calling the vector retriever

```python linenums="1" hl_lines="8-12"
from server.retrieval.vector import VectorRetriever
from server.models.config import VectorSearchConfig

config = VectorSearchConfig(top_k=25, similarity_threshold=0.2)

results = await VectorRetriever(postgres, embedder).search(
    repo_id="myrepo",
    query="Where is the vector search implemented?",
    config=config,
)
```

### 3) PostgresClient contract (what you implement)

```python linenums="1" hl_lines="12-16"
class PostgresClient:
    async def upsert_embeddings(self, repo_id: str, chunks: list[Chunk]) -> int:
        raise NotImplementedError

    async def vector_search(self, repo_id: str, embedding: list[float], top_k: int) -> list[ChunkMatch]:
        raise NotImplementedError

    async def delete_embeddings(self, repo_id: str) -> int:
        raise NotImplementedError
```

??? note "Click to expand: minimal expectations for vector_search()"
    - Accepts:
      - `repo_id` to scope results
      - `embedding` as a Python `list[float]`
      - `top_k` limit
    - Returns:
      - `list[ChunkMatch]` with stable identifiers and a numeric `score`
    - Must be deterministic for the same inputs (modulo concurrent indexing)

---

## Performance tuning tips

### Index choice & parameters

- Prefer **HNSW** for interactive search latency and strong recall.
- Prefer **IVFFlat** when:
  - you have very large corpora
  - you can tune `lists`/`probes`
  - you can rebuild indexes periodically

!!! tip "Tune with real queries"
    Use a representative query set and measure:
    - p50/p95 latency
    - recall@k (against a brute-force baseline on a sample)
    - Postgres CPU and memory

### Batch upserts and concurrency

- Increase `indexing_batch_size` to improve throughput, but watch:
  - memory usage (embedding arrays + chunk payloads)
  - transaction size and lock contention
- Increase `indexing_workers` until Postgres becomes the bottleneck; then stop.

### Keep vectors “close” to the query path

- If you store per-repo tables (`table_name = "code_chunks_{repo}"`), you reduce index size per table and keep scans/index traversals smaller.
- If you store everything in one table, ensure you have:
  - a selective `repo_id` filter
  - appropriate composite indexing strategy for metadata filters (when used)

### Thresholding and top-k

- `top_k` is the first-order driver of query cost.
- `similarity_threshold` (in `VectorSearchConfig`) can reduce downstream load (reranking, hydration), but it does **not** reduce the cost of the initial ANN query unless you also add SQL-side filtering (which is usually not effective with ANN ordering).

!!! warning "Don’t over-filter early"
    In tri-brid fusion, vector results are only one leg. Overly aggressive thresholds can reduce recall and harm fusion quality, especially when sparse/graph legs are also contributing.

---

## Related pages

- [Sparse Search (FTS/BM25)](./sparse-search.md)
- [Graph Search (Neo4j)](./graph-search-neo4j.md)
- [Fusion (RRF / Weighted)](./fusion.md)
- [Configuration (Pydantic models)](./configuration.md)