# API Endpoints

This page documents the TriBridRAG HTTP API exposed by the FastAPI server. Endpoints are grouped by category and reflect the routers registered in [`server/main.py`](../server/main.md) (see also: [Configuration](configuration.md), [Indexing](indexing.md), and [Search & Answering](search.md) pages).

!!! note
    Several endpoints are currently stubbed (`raise NotImplementedError`) in the source. The schemas and paths are still authoritative because FastAPI uses them for OpenAPI generation and client typing.

!!! tip
    Pydantic is **the law**: request/response schemas are defined by Pydantic models (e.g., `server.models.retrieval.*`, `server.models.index.*`, `server.models.config.TriBridConfig`). TypeScript types must be **generated** from these models—never hand-written. See: [Configuration](configuration.md).

---

## Search

Source: `server/api/search.py`

These endpoints drive retrieval and answering. Internally, TriBridRAG fuses **three retrieval legs**—vector (pgvector), sparse (PostgreSQL FTS/BM25), and graph (Neo4j)—using either **RRF** or **weighted scoring** (see: [Search & Fusion](search.md)).

### `POST /search`

**Description**  
Run retrieval and return ranked results (typically chunks and metadata) without generating a final answer.

**Request body schema**: `SearchRequest` (Pydantic)  
: Defined in `server.models.retrieval.SearchRequest`.

**Response schema**: `SearchResponse` (Pydantic)  
: Defined in `server.models.retrieval.SearchResponse`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X POST "http://localhost:8000/search" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "How does TriBridRAG fuse vector, sparse, and graph retrieval?"
      }'
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "results": [
        {
          "id": "chunk_001",
          "score": 0.873,
          "text": "TriBridRAG combines vector search, sparse search, and graph search...",
          "metadata": {
            "repo_id": "example-repo",
            "path": "docs/architecture.md",
            "chunk_index": 12
          }
        }
      ],
      "debug": {
        "fusion_method": "rrf",
        "legs": {
          "vector": { "hits": 10 },
          "sparse": { "hits": 10 },
          "graph": { "hits": 5 }
        }
      }
    }
    ```

!!! warning
    The exact JSON fields depend on `SearchResponse`. Treat the example as illustrative; the authoritative schema is the Pydantic model.

---

### `POST /answer`

**Description**  
Run retrieval + generation and return a final answer (non-streaming). This is the standard “RAG answer” endpoint.

**Request body schema**: `AnswerRequest` (Pydantic)  
: Defined in `server.models.retrieval.AnswerRequest`.

**Response schema**: `AnswerResponse` (Pydantic)  
: Defined in `server.models.retrieval.AnswerResponse`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X POST "http://localhost:8000/answer" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "What are the three retrieval legs in TriBridRAG?",
        "repo_id": "example-repo"
      }'
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "answer": "TriBridRAG fuses three retrieval legs: vector search (pgvector in PostgreSQL), sparse search (PostgreSQL full-text/BM25), and graph search (Neo4j entity relationships).",
      "citations": [
        {
          "id": "chunk_014",
          "path": "docs/overview.md",
          "score": 0.81
        }
      ],
      "debug": {
        "fusion_method": "weighted",
        "model": "provider:model-name"
      }
    }
    ```

---

### `POST /answer/stream`

**Description**  
Run retrieval + generation and stream the answer incrementally.

**Request body schema**: `AnswerRequest` (Pydantic)  
: Defined in `server.models.retrieval.AnswerRequest`.

**Response schema**: `StreamingResponse`  
: Starlette streaming response. The stream format (SSE vs newline-delimited JSON vs raw tokens) is an implementation detail of the server.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -N -sS -X POST "http://localhost:8000/answer/stream" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "Explain Reciprocal Rank Fusion in TriBridRAG.",
        "repo_id": "example-repo"
      }'
    ```

??? note "Click to expand: Example response (illustrative stream)"
    ```text linenums="1"
    data: {"type":"token","value":"Reciprocal"}
    data: {"type":"token","value":" Rank"}
    data: {"type":"token","value":" Fusion"}
    data: {"type":"final","answer":"Reciprocal Rank Fusion (RRF) combines ranked lists by summing reciprocal ranks..."}
    ```

!!! danger
    Do not build clients that assume a specific streaming payload without checking the server implementation. Treat the stream as opaque unless the project defines a formal streaming contract.

---

## Indexing

Source: `server/api/index.py`

Indexing builds/updates the retrieval stores used by TriBridRAG:
- **Vector**: embeddings stored in PostgreSQL via **pgvector**
- **Sparse**: PostgreSQL full-text / BM25-compatible ranking
- **Graph**: Neo4j entities, relationships, and communities

### `POST /index`

**Description**  
Start an indexing job for a repository/dataset.

**Request body schema**: `IndexRequest` (Pydantic)  
: Defined in `server.models.index.IndexRequest`.

**Response schema**: `IndexStatus` (Pydantic)  
: Defined in `server.models.index.IndexStatus`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X POST "http://localhost:8000/index" \
      -H "Content-Type: application/json" \
      -d '{
        "repo_id": "example-repo",
        "force_reindex": false
      }'
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "repo_id": "example-repo",
      "status": "running",
      "started_at": "2026-01-29T12:00:00Z"
    }
    ```

---

### `GET /index/{repo_id}/status`

**Description**  
Get the current indexing status for a repository.

**Path parameters**
repo_id
: `str` — Repository identifier.

**Response schema**: `IndexStatus` (Pydantic)  
: Defined in `server.models.index.IndexStatus`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/index/example-repo/status"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "repo_id": "example-repo",
      "status": "complete",
      "started_at": "2026-01-29T12:00:00Z",
      "finished_at": "2026-01-29T12:03:10Z"
    }
    ```

---

### `GET /index/{repo_id}/stats`

**Description**  
Return indexing statistics (counts, sizes, and other summary metrics).

**Path parameters**
repo_id
: `str` — Repository identifier.

**Response schema**: `IndexStats` (Pydantic)  
: Defined in `server.models.index.IndexStats`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/index/example-repo/stats"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "repo_id": "example-repo",
      "documents": 128,
      "chunks": 2048,
      "entities": 512,
      "relationships": 2040
    }
    ```

---

### `DELETE /index/{repo_id}`

**Description**  
Delete all index data for a repository (vector, sparse, and graph artifacts).

**Path parameters**
repo_id
: `str` — Repository identifier.

**Request body schema**  
: None.

**Response schema**  
: `dict` (untyped JSON object).

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X DELETE "http://localhost:8000/index/example-repo"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "ok": true,
      "repo_id": "example-repo",
      "deleted": true
    }
    ```

!!! warning
    This is a destructive operation. Clients should confirm intent and/or require elevated permissions in production deployments.

---

## Configuration

Source: `server/api/config.py`

TriBridRAG configuration is represented by a single Pydantic model: `TriBridConfig`.

!!! note
    **Pydantic is the law.** All configuration flows from `tribrid_config_model.py` and is exposed via `TriBridConfig`. Any UI types must be generated from the Pydantic schema (see: [Configuration](configuration.md)).

### `GET /config`

**Description**  
Return the current runtime configuration.

**Request body schema**  
: None.

**Response schema**: `TriBridConfig` (Pydantic)  
: Defined in `server.models.config.TriBridConfig`.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/config"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "retrieval": {
        "fusion_method": "rrf",
        "top_k": 20
      },
      "vector": {
        "enabled": true
      },
      "sparse": {
        "enabled": true
      },
      "graph": {
        "enabled": true
      }
    }
    ```

---

### `PUT /config`

**Description**  
Replace the entire configuration with the provided `TriBridConfig`.

**Request body schema**: `TriBridConfig` (Pydantic)  
: Defined in `server.models.config.TriBridConfig`.

**Response schema**: `TriBridConfig` (Pydantic)

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X PUT "http://localhost:8000/config" \
      -H "Content-Type: application/json" \
      -d '{
        "retrieval": { "fusion_method": "weighted", "top_k": 30 },
        "vector": { "enabled": true },
        "sparse": { "enabled": true },
        "graph": { "enabled": true }
      }'
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "retrieval": { "fusion_method": "weighted", "top_k": 30 },
      "vector": { "enabled": true },
      "sparse": { "enabled": true },
      "graph": { "enabled": true }
    }
    ```

!!! warning
    `PUT /config` is a full replacement. If you only want to change one section, prefer `PATCH /config/{section}`.

---

### `PATCH /config/{section}`

**Description**  
Partially update a single configuration section.

**Path parameters**
section
: `str` — Name of the config section to update (must correspond to a field in `TriBridConfig`).

**Request body schema**: `dict`  
: Arbitrary JSON object containing updates for the selected section.

**Response schema**: `TriBridConfig` (Pydantic)

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X PATCH "http://localhost:8000/config/retrieval" \
      -H "Content-Type: application/json" \
      -d '{
        "fusion_method": "rrf",
        "top_k": 25
      }'
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "retrieval": { "fusion_method": "rrf", "top_k": 25 },
      "vector": { "enabled": true },
      "sparse": { "enabled": true },
      "graph": { "enabled": true }
    }
    ```

!!! danger
    Because `updates` is an untyped `dict` at the API boundary, server-side validation must be strict. The server should validate that:
    - `section` is a valid `TriBridConfig` field
    - `updates` keys/types match the corresponding Pydantic sub-model

---

### `POST /config/reset`

**Description**  
Reset configuration to defaults.

**Request body schema**  
: None.

**Response schema**: `TriBridConfig` (Pydantic)

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS -X POST "http://localhost:8000/config/reset"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "retrieval": { "fusion_method": "rrf", "top_k": 20 },
      "vector": { "enabled": true },
      "sparse": { "enabled": true },
      "graph": { "enabled": true }
    }
    ```

---

## Health

Source: `server/api/health.py`

Health endpoints are used for liveness/readiness checks and metrics scraping.

### `GET /health`

**Description**  
Liveness probe. Confirms the API process is running.

**Request body schema**  
: None.

**Response schema**  
: `dict` (untyped JSON object).

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/health"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "status": "ok"
    }
    ```

---

### `GET /ready`

**Description**  
Readiness probe. Confirms dependencies are ready (e.g., PostgreSQL + pgvector, Neo4j).

**Request body schema**  
: None.

**Response schema**  
: `dict` (untyped JSON object).

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/ready"
    ```

??? note "Click to expand: Example response"
    ```json linenums="1"
    {
      "ready": true,
      "dependencies": {
        "postgres": "ok",
        "neo4j": "ok"
      }
    }
    ```

!!! tip
    In production, this endpoint should fail fast if any required retrieval leg is enabled in config but its backing service is unavailable.

---

### `GET /metrics`

**Description**  
Prometheus metrics endpoint.

**Request body schema**  
: None.

**Response schema**: `Response`  
: Typically `text/plain; version=0.0.4` Prometheus exposition format.

??? note "Click to expand: Example curl"
    ```bash linenums="1"
    curl -sS "http://localhost:8000/metrics"
    ```

??? note "Click to expand: Example response"
    ```text linenums="1"
    # HELP tribridrag_requests_total Total HTTP requests
    # TYPE tribridrag_requests_total counter
    tribridrag_requests_total{path="/search",method="POST"} 123
    ```

---

## Related pages

- [Search & Fusion](search.md)
- [Indexing](indexing.md)
- [Configuration](configuration.md)
- [Graph RAG (Neo4j)](graph.md)

!!! note
    Additional routers exist (chat, graph, eval, dataset, cost, docker, reranker, repos, models). This page documents the categories requested: Search, Indexing, Configuration, Health.