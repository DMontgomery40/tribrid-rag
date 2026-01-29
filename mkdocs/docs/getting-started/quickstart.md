# Quick Start

Get TriBridRAG running locally with the full tri-brid stack:

- **Vector search** via **pgvector** in PostgreSQL
- **Sparse search** via **PostgreSQL Full-Text Search / BM25-style ranking**
- **Graph search** via **Neo4j** (entities + relationships + communities)
- **Fusion** via **RRF (Reciprocal Rank Fusion)** or **weighted scoring**

!!! note
    **Pydantic is the law.** All configuration originates from `tribrid_config_model.py`, and **TypeScript types are generated from Pydantic** (never hand-written). See [Configuration](./configuration.md) and [Type Generation](./type-generation.md).

---

## Prerequisites

- Docker + Docker Compose
- Python **3.10+** (3.11 recommended)
- Node.js **18+**
- `uv` (Python package manager)

??? note "Click to expand: install uv"
    === "macOS / Linux"
        ```bash linenums="1"
        curl -LsSf https://astral.sh/uv/install.sh | sh
        ```
    === "Windows (PowerShell)"
        ```powershell linenums="1"
        irm https://astral.sh/uv/install.ps1 | iex
        ```

---

## 1) Clone and set up

```bash linenums="1"
git clone https://github.com/your-org/tribrid-rag.git
cd tribrid-rag
```

Copy the environment file and edit it with your provider keys (if applicable):

```bash linenums="1"
cp .env.example .env
# Edit .env with your API keys and local overrides
```

Install backend dependencies:

```bash linenums="1"
uv sync
```

Install frontend dependencies:

```bash linenums="1"
cd web
npm install
cd ..
```

!!! tip
    If you change any Pydantic models that drive the frontend, regenerate TypeScript types:
    ```bash linenums="1"
    uv run python scripts/generate_types.py
    ```

---

## 2) Start infrastructure (Postgres + Neo4j + observability)

Bring up the core services:

```bash linenums="1"
docker compose up -d postgres neo4j grafana prometheus
```

!!! note
    PostgreSQL runs with the **pgvector** image and stores both relational data and embeddings in the same database instance.

---

## 3) Start the API (FastAPI)

Run the backend locally:

```bash linenums="1"
uv run uvicorn server.main:app --reload
```

The API will be available at:

- API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

---

## 4) Start the web app

In a second terminal:

```bash linenums="1"
cd web
npm run dev
```

Open:

- Web UI: `http://localhost:5173`

---

## 5) Verify services are running (health checks)

### Docker container status

```bash linenums="1"
docker compose ps
```

### API health endpoint

```bash linenums="1"
curl -s http://localhost:8000/health | jq .
```

If you don’t have `jq`, you can omit it:

```bash linenums="1"
curl -s http://localhost:8000/health
```

### Neo4j and Postgres ports

- Neo4j browser: `http://localhost:7474`
- Neo4j Bolt: `bolt://localhost:7687`
- Postgres: `localhost:5432`

!!! warning
    The `api` service in `docker-compose.yml` has its own healthcheck, but if you run the API via `uvicorn` locally (recommended for development), use `GET /health` to validate readiness.

---

## 6) First API call: tri-brid `/search`

TriBridRAG’s `/search` endpoint runs the three retrieval legs (vector + sparse + graph) and fuses results (RRF or weighted scoring depending on config).

!!! danger
    Search quality depends on having indexed content. If you haven’t indexed a repository yet, do that first via the web UI or the indexing endpoint. See [Indexing](./indexing.md).

Below is a **copy-paste** example request.

```bash linenums="1"
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Where is the configuration model defined and how are types generated?",
    "top_k": 10
  }'
```

??? note "Click to expand: what to expect in the response"
    You should receive a JSON payload containing fused results (and often per-leg metadata depending on configuration). If results are empty, confirm:
    1) you indexed a repo, and  
    2) Postgres + Neo4j are healthy, and  
    3) your embedding provider is configured (if vector search is enabled).

---

## Next steps

- [Architecture Overview](./architecture.md) — how the three retrieval legs fuse into one ranked result set
- [Configuration](./configuration.md) — **Pydantic-first** configuration and runtime overrides
- [Indexing](./indexing.md) — chunking, embeddings, entity extraction, and graph building
- [API Reference](./api.md) — endpoints like `/index`, `/search`, `/answer`, and graph inspection
- [Observability](./observability.md) — Prometheus + Grafana setup and dashboards