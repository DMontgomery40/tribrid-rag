# Installation

This page covers installing TriBridRAG in two supported modes:

- **Docker-based installation (recommended)**: fastest path to a working tri-brid stack (PostgreSQL + pgvector, PostgreSQL FTS/BM25-style ranking, and Neo4j graph traversal).
- **Local development with `uv`**: run the FastAPI backend on your host while still using Docker for databases (recommended for development), or run everything locally if you prefer.

!!! note "Tri-brid architecture reminder"
    TriBridRAG fuses **three retrieval legs**:
    
    1. **Vector search** in PostgreSQL via **pgvector**
    2. **Sparse search** via **PostgreSQL Full-Text Search** (BM25-style ranking)
    3. **Graph search** via **Neo4j** (entities, relationships, communities)
    
    Fusion is performed via **RRF (Reciprocal Rank Fusion)** or **weighted scoring**. See [Architecture](./architecture.md) and [Retrieval & Fusion](./retrieval-and-fusion.md).

---

## Prerequisites

### Required

- **Docker** and **Docker Compose**
- **Python 3.11+**
- **Node.js 18+** (for the `web/` frontend)
- **uv** (Python package manager)

### Recommended

- `curl` (for health checks)
- A working embedding provider API key (e.g., OpenAI or Voyage) if you plan to index and search immediately

??? note "Install uv (Click to expand)"
    `uv` installation options vary by OS. Follow the official instructions: https://docs.astral.sh/uv/
    
    After installation, verify:
    
    ```bash linenums="1"
    uv --version
    python --version
    ```

---

## Option A — Docker-based installation (recommended)

This option runs the full stack via Docker Compose. It is the most reproducible way to run TriBridRAG.

### 1) Clone the repository

```bash linenums="1"
git clone https://github.com/your-org/tribrid-rag.git
cd tribrid-rag
```

### 2) Create your environment file

```bash linenums="1"
cp .env.example .env
```

Edit `.env` and set the required variables (see [Environment variables](#environment-variables-required)).

!!! warning "Do not skip `.env`"
    The API container loads configuration from `.env`. Missing keys commonly cause indexing/search to fail (especially embedding and reranking providers).

### 3) Start infrastructure (PostgreSQL + Neo4j + observability)

```bash linenums="1"
docker compose up -d postgres neo4j grafana prometheus
```

You can also start **everything**, including the API container:

```bash linenums="1"
docker compose up -d
```

### 4) Confirm containers are healthy

```bash linenums="1"
docker compose ps
```

You should see `postgres` and `neo4j` as **healthy**.

??? note "Expected ports (Click to expand)"
    - PostgreSQL: `localhost:${POSTGRES_PORT:-5432}`
    - Neo4j HTTP: http://localhost:7474
    - Neo4j Bolt: `bolt://localhost:7687`
    - API: http://localhost:${SERVER_PORT:-8000}
    - Grafana: http://localhost:${GRAFANA_PORT:-3000}
    - Prometheus: http://localhost:9090

---

## Option B — Local development setup with `uv`

This option runs the backend on your host machine (fast iteration), while databases run in Docker.

### 1) Start databases via Docker Compose

```bash linenums="1"
docker compose up -d postgres neo4j
```

### 2) Install Python dependencies with `uv`

From the repo root:

```bash linenums="1"
uv sync
```

This installs dependencies from `pyproject.toml` (Python 3.11+ required).

### 3) Run the API locally

```bash linenums="1"
uv run uvicorn server.main:app --reload
```

The API should be available at:

- http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs

### 4) (Optional) Install and run the frontend

```bash linenums="1"
cd web
npm install
npm run dev
```

Frontend dev server:

- http://localhost:5173

!!! tip "Recommended dev workflow"
    Run **PostgreSQL + Neo4j in Docker**, and run the **API locally** with `uv`. This keeps your iteration loop fast while preserving reproducible databases.

---

## Environment variables required

TriBridRAG reads runtime configuration from environment variables (and from the project’s configuration model). At minimum, you must provide database connectivity and at least one embedding provider if you plan to index.

!!! note "Pydantic is the law"
    All configuration is ultimately validated and shaped by the Pydantic model(s) in `tribrid_config_model.py`.  
    If a value is not accepted by the model, it is not a valid configuration—even if it exists in `.env`.

### Core database variables

These are used by the API to connect to PostgreSQL and Neo4j.

PostgreSQL
: `POSTGRES_HOST`  
: `POSTGRES_PORT`  
: `POSTGRES_DB`  
: `POSTGRES_USER`  
: `POSTGRES_PASSWORD`

Neo4j
: `NEO4J_URI`  
: `NEO4J_USER`  
: `NEO4J_PASSWORD`

!!! tip "Docker Compose defaults"
    The provided `docker-compose.yml` sets sensible defaults:
    
    - PostgreSQL container: `tribrid-postgres` (pgvector-enabled image)
    - Neo4j container: `tribrid-neo4j` (Neo4j 5 community + APOC plugin)
    
    When running the API **inside Docker Compose**, the service uses:
    
    - `POSTGRES_HOST=postgres`
    - `NEO4J_URI=bolt://neo4j:7687`

### AI provider variables (typical)

You will usually need at least one of these to index and retrieve effectively:

OpenAI
: `OPENAI_API_KEY`

Voyage
: `VOYAGE_API_KEY`

Cohere (reranking)
: `COHERE_API_KEY`

!!! warning "Indexing requires embeddings"
    If you attempt to index a repository without a working embedding provider (or a configured local embedding model), the vector leg cannot be built, and tri-brid fusion quality will degrade or indexing may fail depending on your configuration.

---

## Database setup

TriBridRAG uses **two databases**:

- **PostgreSQL** (single instance) for:
  - vector embeddings via **pgvector**
  - sparse retrieval via **PostgreSQL Full-Text Search** (BM25-style ranking)
  - metadata and chunk storage
- **Neo4j** for:
  - entity nodes, relationship edges, and community structure used by graph retrieval

### PostgreSQL + pgvector

The Docker Compose configuration uses:

- Image: `pgvector/pgvector:pg16`
- Port: `5432` (configurable via `POSTGRES_PORT`)
- Persistent volume: `postgres_data`

!!! note "pgvector is required"
    Vector search is implemented in PostgreSQL using **pgvector**. Ensure your PostgreSQL instance has the extension available.

??? note "Manual verification (Click to expand)"
    If you want to confirm pgvector is available:
    
    ```bash linenums="1"
    docker exec -it tribrid-postgres psql -U postgres -d tribrid_rag -c "CREATE EXTENSION IF NOT EXISTS vector;"
    ```
    
    If your database name/user differ, adjust `-U` and `-d` accordingly.

### Neo4j

The Docker Compose configuration uses:

- Image: `neo4j:5-community`
- Ports:
  - HTTP: `7474`
  - Bolt: `7687`
- APOC plugin enabled
- Persistent volumes: `neo4j_data`, `neo4j_logs`

!!! warning "Neo4j credentials must match"
    The API connects using `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`.  
    The Neo4j container is configured via `NEO4J_AUTH=${NEO4J_USER}/${NEO4J_PASSWORD}`—ensure these values are consistent.

---

## Verifying the installation

### 1) Verify services are reachable

API health (Docker or local API)
: ```bash linenums="1"
  curl -f http://localhost:8000/health
  ```

Neo4j HTTP
: ```bash linenums="1"
  curl -f http://localhost:7474
  ```

PostgreSQL readiness (Docker)
: ```bash linenums="1"
  docker exec -it tribrid-postgres pg_isready -U postgres
  ```

!!! tip "FastAPI docs"
    If the API is running, confirm OpenAPI renders:
    
    - http://localhost:8000/docs

### 2) Verify tri-brid retrieval prerequisites

- PostgreSQL is up and accepts connections
- pgvector extension is available
- Neo4j is up and Bolt is reachable
- Your embedding provider key is set (or local embeddings are configured)

See also: [Configuration](./configuration.md) and [Indexing](./indexing.md).

---

## Common installation issues and solutions

### Docker containers are not healthy

**Symptoms**
- `docker compose ps` shows `unhealthy` for `postgres` or `neo4j`
- API container fails to start due to dependency health checks

**Fixes**
- Check logs:
  ```bash linenums="1"
  docker compose logs -f postgres
  docker compose logs -f neo4j
  docker compose logs -f api
  ```
- Ensure ports are not already in use (5432, 7474, 7687, 8000, 3000, 9090).
- On first boot, Neo4j may take longer; wait and re-check health.

### Port conflicts (e.g., 5432 already in use)

**Symptoms**
- Docker reports: “bind: address already in use”

**Fixes**
- Change the host port in `.env` (or your shell environment), e.g.:
  - `POSTGRES_PORT=55432`
  - `SERVER_PORT=18000`
- Restart:
  ```bash linenums="1"
  docker compose down
  docker compose up -d
  ```

### API cannot connect to PostgreSQL or Neo4j

**Symptoms**
- Connection refused / timeout errors in API logs

**Fixes**
- If running API **locally**, your DB host should typically be `localhost`, not the Docker service name:
  - `POSTGRES_HOST=localhost`
  - `NEO4J_URI=bolt://localhost:7687`
- If running API **in Docker Compose**, use service names:
  - `POSTGRES_HOST=postgres`
  - `NEO4J_URI=bolt://neo4j:7687`

!!! warning "Do not mix hostnames across environments"
    `postgres` and `neo4j` resolve only inside the Docker network.  
    `localhost` resolves only from your host machine.

### Missing embedding API keys / provider misconfiguration

**Symptoms**
- Indexing fails
- Search returns empty or low-quality results
- Errors referencing OpenAI/Voyage/Cohere authentication

**Fixes**
- Ensure `.env` contains the correct key(s), e.g. `OPENAI_API_KEY` or `VOYAGE_API_KEY`.
- Confirm the configuration you selected is valid per the Pydantic model.
- Re-run the API after updating `.env`.

### TypeScript types are out of date

**Symptoms**
- Frontend build/type errors after backend config/schema changes

**Fix**
- Regenerate TypeScript types from Pydantic (never hand-edit):
  ```bash linenums="1"
  uv run python scripts/generate_types.py
  ```

!!! note "Generated types are authoritative"
    TypeScript types are generated from Pydantic models. If you find yourself “fixing” types manually in the frontend, you are working against the architecture.

---

## Next steps

- Proceed to [Configuration](./configuration.md) to understand how `tribrid_config.json` and the Pydantic model control behavior.
- Then follow [Indexing](./indexing.md) to ingest a repository and build vector/sparse/graph indices.
- For retrieval behavior and fusion details, see [Retrieval & Fusion](./retrieval-and-fusion.md).