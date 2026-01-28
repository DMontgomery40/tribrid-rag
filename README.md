# TriBridRAG

A tri-brid RAG (Retrieval-Augmented Generation) engine combining vector search, sparse search (BM25), and knowledge graph traversal for superior code understanding.

## Architecture

TriBridRAG uses three complementary retrieval methods:

1. **Vector Search** (pgvector) - Semantic similarity using embeddings
2. **Sparse Search** (PostgreSQL FTS) - Keyword matching with BM25-style ranking
3. **Graph Search** (Neo4j) - Relationship traversal through code entities

Results are fused using Reciprocal Rank Fusion (RRF) or weighted combination, then optionally reranked using a cross-encoder model.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- uv (Python package manager)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/tribrid-rag.git
cd tribrid-rag
```

2. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start infrastructure:
```bash
docker compose up -d postgres neo4j grafana
```

4. Install Python dependencies:
```bash
uv sync
```

5. Install frontend dependencies:
```bash
cd web && npm install && cd ..
```

6. Start the backend:
```bash
uv run uvicorn server.main:app --reload
```

7. Start the frontend (in another terminal):
```bash
cd web && npm run dev
```

8. Open http://localhost:5173 in your browser

## Configuration

The main configuration file is `tribrid_config.json`. You can also configure via the web UI under the RAG tab.

### Embedding Providers

- **OpenAI**: `text-embedding-3-small`, `text-embedding-3-large`
- **Voyage**: `voyage-code-2`, `voyage-large-2`
- **Local**: Any sentence-transformers model

### Reranker Modes

- **none**: No reranking (fastest)
- **local**: Pre-trained cross-encoder (ms-marco-MiniLM)
- **trained**: Your fine-tuned model
- **api**: Cohere, Voyage, or Jina reranking API

## Project Structure

```
tribrid-rag/
├── server/          # Python FastAPI backend
│   ├── api/         # REST endpoints
│   ├── db/          # Database clients (Postgres, Neo4j)
│   ├── indexing/    # Chunking, embedding, graph building
│   ├── models/      # Pydantic schemas
│   ├── retrieval/   # Search and fusion logic
│   └── services/    # Business logic
├── web/             # React TypeScript frontend
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   └── stores/     # Zustand state
├── infra/           # Docker and observability configs
├── scripts/         # Development scripts
├── tests/           # Python tests
└── spec/            # YAML specifications
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/search` | POST | Tri-brid search with fusion |
| `/answer` | POST | RAG-powered answer generation |
| `/index` | POST | Index a repository |
| `/graph/{repo_id}/entities` | GET | List knowledge graph entities |
| `/config` | GET/PUT | Configuration management |
| `/eval/run` | POST | Run evaluation suite |

## Development

### Run Tests
```bash
uv run pytest
```

### Type Checking
```bash
uv run mypy server
```

### Linting
```bash
uv run ruff check server
```

### Generate TypeScript Types
```bash
uv run python scripts/generate_types.py
```

## Observability

- **Metrics**: Prometheus at http://localhost:9090
- **Dashboards**: Grafana at http://localhost:3000 (admin/admin)
- **API Docs**: FastAPI at http://localhost:8000/docs

## License

MIT
