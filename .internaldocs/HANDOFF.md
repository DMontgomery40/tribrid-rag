# TriBridRAG — Exhaustive Handoff Prompt (for a future coding agent)

**Date written:** 2026-01-31  
**Repo root:** `/Users/davidmontgomery/tribrid-rag`  

This file is intentionally long. It is meant to be read by a future “you” (LLM coding agent) who is coming in *cold* with **zero context**.

If you are that future agent: **read this first**, then read `AGENTS.md`, then open the key files called out below.

---

## 0) Mission: what this repo is trying to be

TriBridRAG is a **GraphRAG + hybrid RAG** system with a **rich dashboard UI**. The name “TriBrid” is literal:

1. **Vector retrieval** (dense embeddings) using **Postgres + pgvector**
2. **Sparse retrieval** (keyword/lexical) using **Postgres full-text search** (FTS; BM25-ish ranking)
3. **Graph retrieval** using **Neo4j** (entities + relationships + communities)

The system is intended to:
- Let a user create and manage **corpora** (NOT “repos”) directly from the UI.
- Index a corpus (ingest filesystem content → chunk → embed → store → build graph).
- Search a corpus with tri-brid fusion.
- Keep corpora isolated: each corpus has its **own storage partition**, **its own Neo4j subgraph**, and **its own config**.

### Key terminology (critical)

The project is **corpus-first**, but for compatibility the codebase still uses:
- `repo_id` as the **corpus identifier** (stable slug).

Treat `repo_id == corpus_id` everywhere unless/until a migration fully renames it.

---

## 1) Non-negotiable architecture rules (“Pydantic is the law”)

Read `AGENTS.md` (and `CLAUDE.md`) in full. The core constraints:

- **Pydantic is the law**: `server/models/tribrid_config_model.py` defines what exists.
- Frontend types are generated from Pydantic into `web/src/types/generated.ts` via `uv run scripts/generate_types.py`.
- Frontend stores/hooks/components must import types from `generated.ts`. No handwritten API interfaces.
- **No adapters/transformers** to paper over shape mismatches. Fix the Pydantic model (the source of truth).
- **Config controls behavior**: if something can vary, it should be in Pydantic config.
- **User requirement:** **NO STUBS**. Do not add `raise NotImplementedError`, fake in-memory stores, or placeholder endpoints. Either implement real integration or do not expose the feature yet.

---

## 2) How to run it (ports, dev vs docker, and common pitfalls)

### Dev mode (recommended while building features)

Backend:
```bash
uv sync
uv run uvicorn server.main:app --reload --port 8012
```

Frontend:
```bash
cd web
npm install
npm run dev
```

- Vite dev server runs on `http://localhost:5173`.
- Vite proxies `/api/*` to `http://localhost:8012` (see `web/vite.config.ts`).

### Docker mode (infrastructure)

```bash
docker compose up -d postgres neo4j grafana prometheus
```

**Important:** the `api` container in `docker-compose.yml` is *not* currently volume-mounted to arbitrary local corpora. If you run the backend inside Docker and then try to “add a corpus” pointing at your host filesystem path, **the container will not see it** unless you mount it.

To make corpus creation + indexing work in Docker, you must do one of:
1. Mount corpora paths into the container (preferred for local dev)
2. Implement upload/ingestion into a managed storage area (more “product”)

This is a major “make it real” item.

---

## 3) The “corpus separation” model (how isolation is intended to work)

A corpus is the unit of isolation for:
- **Index data** in Postgres (rows partitioned by `repo_id`)
- **Per-corpus config** (stored in Postgres)
- **Graph** in Neo4j (nodes/edges include `repo_id` and all queries scope by it)

The UI chooses an “active corpus” and everything should use it:
- config GET/PUT
- indexing start
- search/answer
- graph queries
- data quality endpoints (keywords + chunk_summaries)

---

## 4) What was implemented recently (the “real integration” pass)

This repo started as a UI-heavy port from `../agro-rag-engine` with lots of backend stubs.

The integration pass implemented **real persistence** and **real indexing/search flows**:

### 4.1 Postgres became the source of truth (pgvector + FTS + corpus registry)

**File:** `server/db/postgres.py`

Key responsibilities:
- Establish connection pool (`asyncpg`) and register pgvector type (`pgvector.asyncpg.register_vector`).
- Ensure schema exists on connect (tables + indexes).

Tables created/used:
- `corpora`
  - corpus registry (one row per `repo_id`)
  - stores: name, root path, description, meta JSONB, timestamps, embedding metadata
- `corpus_configs`
  - per-corpus `TriBridConfig` stored as JSONB
- `chunks`
  - the actual indexed chunk store:
    - content text
    - `tsv` (tsvector) for FTS
    - `embedding` (vector) for pgvector similarity
  - primary key `(repo_id, chunk_id)`
- `chunk_summaries`
  - per-corpus chunk summaries (data quality layer)
- `chunk_summaries_last_build`
  - last build metadata (timestamp, counts)

Postgres capabilities implemented:
- `upsert_embeddings(repo_id, chunks)`
- `upsert_fts(repo_id, chunks)`
- `vector_search(repo_id, embedding, top_k)`
- `sparse_search(repo_id, query, top_k)`
- corpus CRUD: list/get/upsert/delete
- per-corpus config CRUD: get/upsert JSON
- chunk deletion / stats
- chunk summary storage (replace/list/delete)
- keywords persistence via `corpora.meta` update (NOT an in-memory `_STORE`)

**Very likely gotcha:** `chunks.embedding` is created as `vector` (undimensioned) if the pgvector version supports it; otherwise it falls back to `vector(<dim>)`. If you are on a pgvector build that requires fixed dimensions, you cannot safely vary embedding dimensions per corpus without more design work.

### 4.2 Neo4j became real (entities + relationships + communities + graph search)

**File:** `server/db/neo4j.py`

Capabilities:
- `upsert_entities(repo_id, entities)`
- `upsert_relationships(repo_id, rels)` with a strict allowlist of relationship types (cypher rel types are literal)
- `get_entity`, `list_entities`, `get_relationships`
- `detect_communities(repo_id)` (currently a heuristic: top-level directory grouping; **not** GDS Louvain yet)
- `graph_search(repo_id, query, max_hops, top_k)` returns entity-level hits (hydrated later)
- `get_graph_stats(repo_id)`
- `delete_graph(repo_id)`
- `execute_cypher` read-only guard

### 4.3 Graph building during indexing (currently Python-leaning)

**File:** `server/indexing/graph_builder.py`

GraphBuilder builds a graph from the corpus’ files. Current implementation uses Python AST to extract:
- Entities: module/class/function (and possibly others)
- Relationships (best-effort): contains/imports/inherits/calls

It then writes:
- Entity nodes and relationship edges into Neo4j
- Communities (heuristic) into Neo4j

**Very likely limitation:** this graph builder is not a true multi-language code graph. If you want GraphRAG across TS/JS/etc, you’ll need a real parser strategy (tree-sitter, language servers, etc.) and config-driven entity/relationship extraction.

### 4.4 Indexing pipeline is real and runs async + streams logs (SSE)

**File:** `server/api/index.py`

Endpoints:
- `POST /api/index` (canonical) with `IndexRequest` (`repo_id`, `repo_path`, `force_reindex`)
- `POST /api/index/start` (compat) to match legacy UI, and it can resolve `repo_path` from the corpus registry if missing
- `GET /api/stream/operations/index?repo=<repo_id>` streams log/progress/complete/error events via SSE
- `GET /api/index/{repo_id}/status`
- `GET /api/index/{repo_id}/stats` (reads from Postgres; 404 if no index)
- `DELETE /api/index/{repo_id}` deletes Postgres chunks/fts/embeddings + Neo4j graph

Indexing flow (high-level):
1. Load **per-corpus config** (`server/services/config_store.py`)
2. Load files from disk (`server/indexing/loader.py`)
3. Chunk files (`server/indexing/chunker.py`)
4. Embed chunks (`server/indexing/embedder.py`)
5. Write embeddings + FTS into Postgres
6. Build graph in Neo4j (optional; best-effort)
7. Update corpus embedding metadata in Postgres
8. Update in-memory `_STATUS` + SSE queue for UI

**Very likely scalability issue:** `files = list(loader.load_repo(repo_path))` loads every file’s content into memory at once. For large corpora this will be a problem. Fixing this while keeping deterministic progress is non-trivial.

### 4.5 Per-corpus config persistence is real

**File:** `server/services/config_store.py` and `server/api/config.py`

- Global config remains `tribrid_config.json` on disk (template/defaults)
- Per-corpus config stored in Postgres `corpus_configs`
- `/api/config` endpoints accept `repo_id` query parameter to scope config
- Frontend config client auto-includes `repo_id` on config calls (`web/src/api/config.ts`)

### 4.6 Search is real tri-brid fusion (vector + sparse + graph)

**Files:** `server/api/search.py`, `server/retrieval/fusion.py`

- `POST /api/search`:
  - checks corpus exists
  - runs TriBrid fusion using per-corpus config
- Vector leg: Postgres pgvector search
- Sparse leg: Postgres FTS search
- Graph leg: Neo4j entity search + **hydration** back to actual Postgres chunks via file spans

**Note:** Generation (`/api/answer`, `/api/answer/stream`) is gated and will return 503 if `OPENAI_API_KEY` is not set (this is intentional until a full provider story is in place).

### 4.7 Corpus CRUD is real (create corpus directly from UI)

**Backend:** `server/api/repos.py` (still named “repos” for compat)
- `GET /api/repos` list corpora (from Postgres)
- `POST /api/repos` create corpus:
  - validates `path` exists on the server filesystem
  - writes row to Postgres `corpora`
  - seeds per-corpus config from global
- `GET /api/repos/{repo_id}` get corpus
- `GET /api/repos/{repo_id}/stats`:
  - filesystem scan for file stats (best-effort)
  - index stats from Postgres
  - graph stats from Neo4j
- `DELETE /api/repos/{repo_id}` deletes corpus row and graph

**Frontend:** `web/src/stores/useRepoStore.ts`, `web/src/components/ui/RepoSwitcherModal.tsx`
- Repo switcher modal now supports **creating a corpus inline** (name/path/description)
- Store persists active corpus in `localStorage` and `?repo=` URL param
- Emits `agro-repo-changed` events so other hooks/stores can refresh

### 4.8 Data quality endpoints became Postgres-backed (no in-memory stubs)

**Backend:** `server/api/chunk_summaries.py`, `server/api/keywords.py`
- chunk summaries build/list/delete stored in Postgres tables
- keyword generation reads chunks from Postgres and stores keywords in `corpora.meta`

**Frontend:** `web/src/components/RAG/DataQualitySubtab.tsx`
- Calls `/api/chunk_summaries` and `/api/keywords/generate`

**Very likely UI bug:** `DataQualitySubtab` currently uses a local `corpusId` state defaulting to `"tribrid"` instead of the global active corpus from the store. Fixing this is necessary for real “corpus separation” UX.

---

## 5) What was updated in docs/rules (corpus-first)

The following were updated to clarify corpus-first terminology and compat `repo_id` naming:
- `README.md` now documents corpora and the correct `/api/...` endpoints.
- `AGENTS.md` and `CLAUDE.md` now include a corpus-vs-repo terminology section.
- `web/src/hooks/AGENTS.md` and `web/src/stores/AGENTS.md` updated to say “corpora”, and to match actual store counts/events.

**Likely still outdated:** MkDocs docs under `mkdocs/docs/` still reference “repository”, old paths, and even claim stubs exist. Treat MkDocs as needing a sweep.

---

## 6) Things that are still NOT real (and must be fixed if “no stubs” is enforced)

Search for `raise NotImplementedError` to find remaining stubs:

- `server/api/health.py`: `/ready` and `/metrics` are stubs.
- `server/api/docker.py`: docker control endpoints are stubs.
- `server/api/cost.py`: cost endpoints are stubs.
- `server/retrieval/rerank.py`: local/learning/cloud reranker functions are stubs.
- `server/retrieval/learning.py`: learning reranker training functions are stubs.
- `server/indexing/summarizer.py`: summarizer is a stub.
- `server/retrieval/graph.py`: `expand_context` is a stub.

Given the user requirement (“never ever put stubs”), you should either:
1) Implement these for real, end-to-end, including persistence where applicable, OR
2) Remove/disable the endpoints/features in UI/docs until implemented.

Do not leave “dead” endpoints in production UI.

---

## 7) Likely mistakes / sharp edges (read before changing anything)

This section is intentionally candid: these are the places a future agent is most likely to get burned.

### 7.1 Docker corpus paths are not mounted

`POST /api/repos` validates corpus paths exist on the server filesystem. If the backend runs in Docker, the container filesystem won’t include arbitrary host paths.

If you want “add corpus from UI” to work reliably in Docker, you need:
- a defined mount point + UI guidance, or
- an upload/ingestion model, or
- a dedicated corpus storage path inside the container.

### 7.2 Embedding dimension variability vs pgvector table type

`chunks.embedding` is created as `vector` (undimensioned) if supported; otherwise it becomes `vector(<dim>)`.

If you’re on the fixed-dimension path:
- changing `embedding_dim` in config may break inserts.
- per-corpus embedding dimension becomes extremely tricky.

Possible fixes:
- enforce a single global embedding dimension (and validate config)
- use separate tables per embedding dimension
- store embeddings in a separate table keyed by (repo_id, chunk_id, dim) with multiple columns (heavy)

### 7.3 Memory/perf on large corpora

Indexing currently loads all file contents into memory to compute progress deterministically.

For large corpora:
- memory blow-ups are likely
- graph build pass also gets `files` list (contains content) and can double memory pressure

Consider redesign:
- stream files and compute progress based on file count only (without storing content)
- two-pass approach: first collect file list (paths only), second stream content
- or store progress in a DB table to avoid in-memory queues

### 7.4 SSE queues are in-memory per process

Indexing logs/progress are pushed into `_EVENT_QUEUES[repo_id]` (an `asyncio.Queue` in memory).

This means:
- refresh/restart loses logs
- multi-worker deployment breaks unless sticky routing

### 7.5 UI corpus selection inconsistencies

Some UI subtabs use the global store’s active corpus; others still hardcode or maintain local “repo” state.

If corpus separation is a product requirement, unify all relevant subtabs to use:
- `useRepoStore` active corpus
- and/or a shared CorpusSelector component

### 7.6 PostgresClient.get_chunk/get_chunks ignore repo_id (if you ever use them)

`PostgresClient.get_chunk(chunk_id)` and `.get_chunks(chunk_ids)` currently query by `chunk_id` without scoping `repo_id`.

This is safe only if chunk IDs are globally unique across all corpora (they are usually not).
If you start using these methods in new features, fix them first to accept and filter by `repo_id`.

### 7.7 Stop hook + mypy “unused ignore” failures

The repo has a stop hook at `.claude/hooks/verify-tribrid.sh` that runs:
- `mypy server/ --ignore-missing-imports`
- and `pyproject.toml` has `warn_unused_ignores = true`

So if you add `# type: ignore[import-untyped]` to imports, it may fail as “unused” (because `--ignore-missing-imports` already suppresses the import errors).

Rule of thumb:
- don’t add ignore comments unless you verified mypy truly needs them under the hook’s invocation.

---

## 8) What has to happen next to make this “fully real” (suggested priority order)

This is a pragmatic roadmap aligned to “real integration” + “no stubs”.

### P0 — Make corpus ingestion real in Docker

Pick one:
- mount corpora into the container and constrain corpus paths to that mount
- or implement uploading (zip/tar), store under a managed directory, and index there

Update UI copy to reflect the model (don’t tell the user to go to Infra tab).

### P0 — Remove remaining stubs (implement or delete)

Implement for real:
- `/api/ready`: check Postgres + Neo4j connectivity and return structured status
- `/api/metrics`: either add `prometheus_client` dependency and real metrics, or remove the endpoint
- docker endpoints: either real docker compose integration (subprocess with guardrails) or remove from UI
- cost endpoints: implement cost estimate from `data/models.json` and persist history in Postgres
- reranker: implement at least “none” + one real mode (local or API) end-to-end
- summarizer: implement deterministic or LLM-based summarization; store summaries (probably in Postgres)

### P1 — Make “corpus” naming real across API + UI (without breaking compat)

Strategy:
- keep `repo_id` fields in models for now, but add `validation_alias=AliasChoices("repo_id", "corpus_id", ...)` consistently
- optionally add `/api/corpora` endpoints as aliases to `/api/repos` (but remember: no adapters—this should be a router alias that returns the same Pydantic models)
- update UI labels/components to say “Corpus”

### P1 — Improve graph building and communities

Current “community detection” is a heuristic. If you want real GraphRAG:
- add Neo4j GDS-based algorithms (Louvain/Label Prop) if licensing permits and if you run GDS
- or implement a deterministic clustering approach with explicit semantics

Also extend graph extraction beyond Python if needed (tree-sitter).

### P1 — Add vector index and operational tuning

For serious performance:
- add HNSW/IVFFlat index creation for pgvector (config-driven, careful with migrations)
- add batching in indexing (embed + write in chunks, not per file)
- add incremental indexing (hash file content; delete/update changed files only)

### P2 — UI tests that prove corpus creation + indexing works

The repo’s rules expect real tests.
Add Playwright tests that:
- create a corpus from the modal
- run indexing
- reload and verify index stats changed
- run a search and see results

---

## 9) Verification / “how to know you didn’t break the repo”

The stop hook expects these to pass (or it will block completion):

```bash
uv run scripts/check_banned.py
uv run scripts/validate_types.py
uv run pytest -q
uv run mypy server
uv run ruff check server
npm --prefix web run build
```

If you change Pydantic models:
```bash
uv run scripts/generate_types.py
uv run scripts/validate_types.py
```

---

## 10) Handy debugging commands (Postgres + Neo4j)

### Postgres (schema + counts)

```sql
-- corpora
SELECT repo_id, name, root_path, created_at, last_indexed FROM corpora ORDER BY created_at DESC;

-- chunk counts per corpus
SELECT repo_id, COUNT(*) FROM chunks GROUP BY repo_id ORDER BY COUNT(*) DESC;

-- check that embeddings exist
SELECT repo_id, COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS embedded
FROM chunks GROUP BY repo_id;

-- check that FTS vectors exist
SELECT repo_id, COUNT(*) FILTER (WHERE tsv IS NOT NULL) AS fts_ready
FROM chunks GROUP BY repo_id;
```

### Neo4j (per-corpus counts)

```cypher
MATCH (e:Entity {repo_id: $repo_id}) RETURN count(e) AS entities;
MATCH (:Entity {repo_id: $repo_id})-[r]->(:Entity {repo_id: $repo_id}) RETURN type(r) AS t, count(r) AS n ORDER BY n DESC;
MATCH (c:Community {repo_id: $repo_id}) RETURN count(c) AS communities;
```

---

## 11) Quick orientation: key files to open first

Backend:
- `server/models/tribrid_config_model.py` (THE LAW; also includes domain models like Corpus, Entity, Relationship, etc.)
- `server/db/postgres.py` (persistence + retrieval primitives)
- `server/db/neo4j.py` (graph persistence + queries)
- `server/services/config_store.py` (per-corpus config)
- `server/api/repos.py` (corpus CRUD)
- `server/api/index.py` (indexing + SSE)
- `server/api/search.py` + `server/retrieval/fusion.py` (tri-brid search)
- `server/indexing/graph_builder.py` (graph extraction logic)

Frontend:
- `web/src/stores/useRepoStore.ts` (active corpus + create/select)
- `web/src/components/ui/RepoSwitcherModal.tsx` (create corpus UX)
- `web/src/components/Dashboard/QuickActions.tsx` (index button)
- `web/src/api/config.ts` + `web/src/hooks/useConfig.ts` (scoped config)

---

## 12) If you only do one thing…

If the user is demanding “REAL INTEGRATION” and “NO STUBS”, the single best next step is:

1) Make corpus ingestion work in Docker (mount or upload), and  
2) Replace the remaining `NotImplementedError` endpoints with real implementations (or remove them from UI).

Everything else is incremental refinement.

