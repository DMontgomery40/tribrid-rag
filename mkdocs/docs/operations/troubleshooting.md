# Troubleshooting

This page collects the most common TriBridRAG failure modes and the fastest ways to diagnose and fix them. TriBridRAG is *tri-brid* by design: vector search (pgvector in PostgreSQL), sparse search (PostgreSQL FTS/BM25-style ranking), and graph search (Neo4j). When something “doesn’t work,” the first step is identifying which leg (or fusion) is failing.

!!! note
    Before deep debugging, confirm the backend is up and responding:
    - FastAPI docs: <http://localhost:8000/docs>
    - Health endpoint (if exposed): see `server/api/health`

---

## Quick triage checklist

??? note "Click to expand"
    1. **Infrastructure up?**
       - `docker compose ps` shows `postgres` and `neo4j` as healthy/running.
    2. **Backend up?**
       - `uv run uvicorn server.main:app --reload` is running and logs show no startup errors.
    3. **Config valid?**
       - TriBridRAG config is validated by Pydantic. If config parsing fails, fix config first.
    4. **Index exists?**
       - You must index a repository before search returns meaningful results.
    5. **Which leg fails?**
       - Vector: embeddings + pgvector
       - Sparse: PostgreSQL FTS
       - Graph: Neo4j entities/relationships
       - Fusion: RRF or weighted scoring

!!! warning
    **Pydantic is the law.** If configuration is invalid, TriBridRAG should fail fast. Do not “patch around” config errors in code or the UI—fix the configuration model inputs instead. See [Configuration](./configuration.md) and [Type Generation](./type-generation.md).

---

## 1) Connection errors (PostgreSQL / Neo4j)

### Symptoms

- Backend fails at startup or on first request.
- Errors like:
  - `connection refused`
  - `timeout`
  - `authentication failed`
  - `could not translate host name`
- Search endpoints return 500s; indexing fails immediately.

### Diagnosis steps

1. Confirm containers are running:
   ```bash linenums="1"
   docker compose ps
   ```

2. Inspect logs for the failing service:
   ```bash linenums="1"
   docker compose logs -f postgres
   ```
   ```bash linenums="1"
   docker compose logs -f neo4j
   ```

3. Verify the backend has the correct environment variables (from `.env`):
   ```bash linenums="1"
   cat .env
   ```

4. Confirm the backend exposes routes (router wiring is in `server/main.py`):
   - `/search` (tri-brid retrieval)
   - `/index` (indexing)
   - `/graph/...` (graph inspection)
   - `/config` (configuration management)

   If the server is up, check:
   - <http://localhost:8000/docs>

### Solutions

- **PostgreSQL connection refused**
  - Ensure `postgres` is started:
    ```bash linenums="1"
    docker compose up -d postgres
    ```
  - Ensure the host/port in `.env` matches your compose mapping.

- **Neo4j connection/auth issues**
  - Ensure `neo4j` is started:
    ```bash linenums="1"
    docker compose up -d neo4j
    ```
  - Confirm Neo4j credentials in `.env` match the container configuration.
  - If you changed the password, restart Neo4j and update `.env`.

- **Network name resolution issues**
  - If running backend outside Docker, use `localhost` + published ports.
  - If running backend inside Docker, use the compose service names (`postgres`, `neo4j`) as hosts.

!!! tip
    If you can hit the FastAPI docs but database calls fail, the issue is almost always `.env` connectivity or container health—not routing.

---

## 2) Embedding failures

Embedding failures break the vector leg (pgvector) and often prevent indexing entirely.

### Symptoms

- Indexing fails during embedding generation.
- Search returns only sparse/graph results (or very low quality).
- Errors like:
  - `401 Unauthorized` / `403 Forbidden` (API key)
  - `429 Too Many Requests` (rate limiting)
  - `model not found`
  - timeouts calling embedding provider

### Diagnosis steps

1. Confirm your embedding provider configuration is valid.
   - TriBridRAG configuration is validated by Pydantic (source of truth: `tribrid_config_model.py`).
   - If config fails validation, fix config first.

2. Confirm required API keys exist in `.env`:
   ```bash linenums="1"
   grep -E "OPENAI|VOYAGE|JINA|COHERE" .env
   ```

3. Re-run indexing and watch logs:
   ```bash linenums="1"
   uv run uvicorn server.main:app --reload
   ```
   In another terminal, trigger indexing via the UI or `/index`.

4. If using a local embedding model, confirm it is installed and loadable in your environment.

### Solutions

- **Auth errors (401/403)**
  - Fix the API key in `.env`.
  - Ensure the backend process was restarted after editing `.env`.

- **Rate limiting (429)**
  - Reduce indexing concurrency (if configurable).
  - Index smaller repos first to validate the pipeline.
  - Retry after cooldown.

- **Model mismatch**
  - Ensure the configured embedding model name is supported by the provider.
  - Keep embedding dimensionality consistent with the pgvector column used for storage (dimension mismatches typically surface during insert).

!!! warning
    If embeddings fail, the vector leg will be empty. Fusion (RRF/weighted) can still return sparse/graph hits, but overall quality will degrade significantly.

---

## 3) Search returning no results

“No results” can mean: nothing indexed, one leg empty, filters too strict, or fusion thresholds eliminating candidates.

### Symptoms

- `/search` returns an empty list.
- UI shows no hits even for obvious queries.
- Graph endpoints return empty entity lists.

### Diagnosis steps

1. Confirm you indexed a repository successfully.
   - Use the UI or `/repos` + `/index` flow.
   - Check backend logs for indexing completion.

2. Determine which leg is empty:

   - **Vector leg**: embedding + pgvector storage
   - **Sparse leg**: PostgreSQL FTS index populated
   - **Graph leg**: Neo4j entities/relationships created

3. Check graph population:
   - Use `/graph/{repo_id}/entities` (listed in README) to confirm entities exist.

4. Check configuration for overly restrictive filters:
   - Repo ID mismatch
   - File path filters
   - Language filters
   - Minimum score thresholds
   - Top-k too small

### Solutions

- **Nothing indexed**
  - Re-run indexing and ensure it completes without errors.
  - Verify Postgres and Neo4j are reachable during indexing.

- **Only one leg populated**
  - If vector is empty: fix embeddings (see [Embedding failures](#2-embedding-failures)).
  - If sparse is empty: ensure chunk text is being stored and FTS is enabled in Postgres schema/migrations.
  - If graph is empty: ensure graph-building is enabled and Neo4j is reachable.

- **Fusion eliminates results**
  - If using **RRF**, ensure each leg returns enough candidates (RRF needs ranks to fuse).
  - If using **weighted scoring**, ensure weights and thresholds aren’t effectively zeroing out all candidates.

!!! tip
    When debugging “no results,” temporarily increase per-leg `top_k` and reduce minimum score thresholds to confirm retrieval is working end-to-end, then tighten back up.

---

## 4) Performance issues (slow indexing / slow search)

Performance problems can come from any of the three legs, plus reranking.

### Symptoms

- Indexing takes “forever.”
- `/search` latency is high.
- CPU pegged, DB slow queries, or Neo4j traversal is slow.
- Reranking dominates request time.

### Diagnosis steps

1. Identify which stage is slow:
   - Indexing: chunking → embedding → Postgres inserts → Neo4j writes
   - Search: vector query → FTS query → graph traversal → fusion → optional rerank

2. Check container resource usage:
   ```bash linenums="1"
   docker stats
   ```

3. Inspect Postgres slow queries (if enabled) and Neo4j query logs.

4. Temporarily disable reranking to isolate retrieval latency:
   - Set reranker mode to `none` in config (via `/config` or UI).

### Solutions

- **Vector search slow**
  - Ensure pgvector indexes are created (IVFFlat/HNSW depending on your schema).
  - Reduce `top_k` for vector retrieval.
  - Avoid overly large embedding dimensions if configurable.

- **Sparse search slow**
  - Ensure FTS indexes exist and are used.
  - Reduce query complexity and `top_k`.

- **Graph traversal slow**
  - Reduce traversal depth / breadth (community expansion can explode).
  - Ensure Neo4j has appropriate indexes/constraints for entity lookup.

- **Reranker slow**
  - Use `none` or a faster local model for development.
  - Reduce number of candidates passed into reranking (smaller fused `top_k`).

!!! note
    TriBridRAG fuses three legs. If you set each leg to `top_k=50` and then rerank 150 candidates, latency will reflect the slowest leg plus reranking overhead.

---

## 5) Memory problems (OOM / crashes)

Memory issues are most common during indexing (large repos) and reranking (large candidate sets).

### Symptoms

- Backend process killed (OOM).
- Docker containers restart unexpectedly.
- Python errors like `MemoryError`.
- Neo4j or Postgres container exits under load.

### Diagnosis steps

1. Check system and container memory:
   ```bash linenums="1"
   docker stats
   ```

2. Check backend logs around the crash time.

3. Identify whether the spike happens during:
   - Chunking (too many files loaded at once)
   - Embedding batching (batch too large)
   - Reranking (too many candidates)

### Solutions

- Reduce indexing batch sizes and concurrency (if configurable).
- Index fewer repositories at once.
- Reduce chunk size / number of chunks produced (if configurable).
- Reduce per-leg `top_k` and fused candidate count before reranking.
- Increase Docker memory limits (Docker Desktop) if you’re running locally.

!!! warning
    If you increase `top_k` aggressively across all three legs and enable reranking, memory usage can grow quickly. Keep candidate counts bounded.

---

## 6) Docker issues

Docker problems typically manifest as “everything is configured correctly, but nothing can connect.”

### Symptoms

- `docker compose up` fails.
- Containers start but immediately exit.
- Ports already in use.
- Volumes/migrations appear “stuck” across restarts.

### Diagnosis steps

1. Check compose status:
   ```bash linenums="1"
   docker compose ps
   ```

2. Inspect logs:
   ```bash linenums="1"
   docker compose logs -f
   ```

3. Check for port conflicts:
   ```bash linenums="1"
   lsof -i :5432
   ```
   ```bash linenums="1"
   lsof -i :7687
   ```

4. If state seems corrupted, inspect volumes:
   ```bash linenums="1"
   docker volume ls
   ```

### Solutions

- **Port conflicts**
  - Stop the conflicting service or change the published port in `docker-compose.yml`.

- **Bad persisted state**
  - If you can safely reset local data:
    ```bash linenums="1"
    docker compose down -v
    docker compose up -d postgres neo4j grafana
    ```

- **Container exits immediately**
  - Read the container logs; most often it’s invalid env vars, permissions, or insufficient memory.

!!! danger
    `docker compose down -v` deletes volumes (your local Postgres/Neo4j data). Only do this if you’re sure you can re-index.

---

## Related pages

- [Configuration](./configuration.md)
- [Indexing](./indexing.md)
- [Search & Fusion (RRF / weighted scoring)](./search-and-fusion.md)
- [Graph RAG (Neo4j entities & relationships)](./graph-rag.md)
- [Type Generation (Pydantic → TypeScript)](./type-generation.md)

---

## Reference: what “healthy” looks like

```mermaid
flowchart LR
  Q[Query] --> V[Vector search<br/>Postgres + pgvector]
  Q --> S[Sparse search<br/>Postgres FTS (BM25-style)]
  Q --> G[Graph search<br/>Neo4j traversal]

  V --> F[Fusion<br/>RRF or weighted scoring]
  S --> F
  G --> F

  F --> R[Rerank (optional)<br/>cross-encoder]
  R --> A[Answer / Results]
```

??? note "Click to expand"
    If you can:
    - index a repo without errors,
    - list entities via `/graph/{repo_id}/entities`,
    - and `/search` returns results with reranking disabled,
    
    then the core tri-brid pipeline is functioning. From there, tune fusion weights/RRF parameters and reranking for quality and latency.