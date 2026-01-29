# Model Configuration

TriBridRAG treats **model selection as data**, not code. The single source of truth is `data/models.json`, served verbatim by the backend at [`/api/models`](#api-endpoints-apimodels). The UI must populate every model dropdown from that endpoint—no hardcoded lists.

!!! note "Related pages"
    - [Configuration Overview](./configuration-overview.md)
    - [Tri-Brid Retrieval & Fusion](./retrieval-and-fusion.md)
    - [Reranking](./reranking.md)

---

## Why `models.json` exists

`data/models.json` is the canonical registry for:

- Which models exist (across providers)
- What each model can be used for (**EMB**, **GEN**, **RERANK**)
- Context window / embedding dimensions
- Pricing metadata for cost estimation and reporting

The backend exposes this registry via a dedicated API module:

- `server/api/models.py` loads `data/models.json`
- The API returns the JSON content (or filtered subsets) to the frontend

!!! warning "No hardcoded model lists"
    The backend docstring is explicit: **every dropdown (embedding, generation, reranker) MUST use `/api/models`.**  
    If you add a model anywhere else, it will drift and eventually break.

---

## `models.json` structure

At the top level, `models.json` is a dictionary with metadata plus a `models` array:

- `currency`: Currency used for pricing fields (e.g., `"USD"`)
- `last_updated`: Human-managed timestamp
- `sources`: List of pricing sources and dates
- `models`: List of model definition objects

??? note "Click to expand: minimal schema sketch"
    - `currency` (string)
    - `last_updated` (string)
    - `sources` (string[])
    - `models` (object[]), where each object typically includes:
        - `provider` (string)
        - `family` (string)
        - `model` (string)
        - `components` (string[]) — includes one or more of `EMB`, `GEN`, `RERANK`
        - `unit` (string) — pricing unit (e.g., `1k_tokens`, `request`)
        - Pricing fields (vary by component)
        - Capability fields (e.g., `context`, `dimensions`)
        - `notes` (string)

=== "JSON"
    ```json linenums="1" hl_lines="1 4 8 9 10"
    {
      "currency": "USD",
      "last_updated": "2025-11-29",
      "sources": [
        "https://openai.com/api/pricing/ (2025-11-29)"
      ],
      "models": [
        {
          "provider": "openai",
          "family": "text-embedding-3-large",
          "model": "text-embedding-3-large",
          "components": ["EMB"],
          "unit": "1k_tokens",
          "embed_per_1k": 0.00013,
          "dimensions": 3072,
          "notes": "Large embeddings"
        }
      ]
    }
    ```

!!! tip "Naming conventions"
    - `provider` is used for grouping/filtering in the UI and API.
    - `model` is the identifier you pass into runtime configuration (e.g., `embedding.embedding_model`, `generation.gen_model`, reranker model fields).
    - `family` is a UI-friendly grouping label; it can match `model` but doesn’t have to.

---

## Model component types: `EMB`, `GEN`, `RERANK`

Each model advertises one or more capabilities via `components`.

### `EMB` — Embeddings
Embedding models are used during indexing and query-time vectorization.

Common fields:
- `embed_per_1k`: Cost per 1k tokens (if applicable)
- `dimensions`: Embedding dimensionality (important for pgvector schema compatibility)

Example:
- OpenAI `text-embedding-3-large` has `dimensions: 3072`

!!! warning "Embedding dimensions must match your index"
    If you change embedding models (and therefore dimensions), you typically must rebuild the pgvector index/table to match the new dimension.

### `GEN` — Generation
Generation models are used for chat answers, enrichment prompts, and analysis steps.

Common fields:
- `input_per_1k`, `output_per_1k`: Token pricing
- `context`: Context window size

### `RERANK` — Reranking
Rerankers refine candidate results after retrieval.

Common fields:
- Either `per_request` (common for “search request” pricing)
- Or `rerank_per_1k` (token-based reranking pricing)

---

## Provider support

TriBridRAG supports multiple providers in `models.json`. The registry is intentionally provider-agnostic: the UI and backend treat providers as data.

Common providers you’ll see:

- **openai**
- **anthropic**
- **voyage**
- **local** (self-hosted / local runtime)
- **huggingface** (local model identifiers)
- **ollama** (local runtime via Ollama)

!!! note "Provider vs runtime backend"
    Provider labels in `models.json` are for selection and display.  
    Actual runtime behavior is controlled by configuration (see `EmbeddingConfig`, `GenerationConfig`, `RerankingConfig` in `server/models/tribrid_config_model.py`) and the code paths that implement each backend.

---

## Cost tracking fields

Pricing fields are optional but strongly recommended. They enable consistent cost estimation across providers.

Use the correct fields for the component type:

- **GEN**
  - `unit`: typically `"1k_tokens"`
  - `input_per_1k`: numeric
  - `output_per_1k`: numeric
  - `context`: integer (tokens)

- **EMB**
  - `unit`: typically `"1k_tokens"`
  - `embed_per_1k`: numeric
  - `dimensions`: integer

- **RERANK**
  - `unit`: either `"request"` or `"1k_tokens"`
  - If request-based: `per_request`
  - If token-based: `rerank_per_1k`

!!! tip "Keep `sources` and `last_updated` current"
    When you change pricing, update:
    - `last_updated`
    - `sources` (include the URL and date you used)

---

## Adding a new model to `models.json`

1. **Pick the correct `components`**
   - `["EMB"]`, `["GEN"]`, `["RERANK"]`, or a combination if the provider/model truly supports multiple roles.

2. **Choose a stable `model` identifier**
   - This is what the UI will send and what config will store.

3. **Add capability fields**
   - `dimensions` for embeddings
   - `context` for generation (and optionally rerankers if meaningful)

4. **Add pricing fields**
   - Use the correct pricing keys for the component type (see above).

5. **Validate via the API**
   - Start the server and confirm the model appears in:
     - `GET /api/models`
     - `GET /api/models/by-type/EMB` (or GEN/RERANK)
     - `GET /api/models/providers/{provider}`

=== "JSON"
    ```json linenums="1" hl_lines="2 3 4 5 6 7 8"
    {
      "provider": "voyage",
      "family": "voyage-code-3",
      "model": "voyage-code-3",
      "components": ["EMB"],
      "unit": "1k_tokens",
      "embed_per_1k": 0.00018,
      "dimensions": 1024,
      "notes": "Voyage Code embeddings"
    }
    ```

!!! warning "Do not add new model lists in code"
    If you need a new dropdown option, add it to `models.json`.  
    The UI must discover it through `/api/models`.

---

## API endpoints: `/api/models`

The backend serves `models.json` through `server/api/models.py`.

### Endpoints

- `GET /api/models`
  - Returns **all** model definitions (the `models` array from `models.json`)

- `GET /api/models/by-type/{component_type}`
  - Filters by component type: `EMB`, `GEN`, `RERANK` (case-insensitive)
  - Returns only models whose `components` include that type

- `GET /api/models/providers`
  - Returns sorted unique provider names

- `GET /api/models/providers/{provider}`
  - Returns all models for a given provider

=== "Python"
    ```python linenums="1" hl_lines="1 9 20 29"
    from fastapi import APIRouter, HTTPException
    from pathlib import Path
    import json

    router = APIRouter(prefix="/api/models", tags=["models"])
    MODELS_PATH = Path(__file__).parent.parent.parent / "data" / "models.json"

    def _load_models() -> list[dict]:
        if not MODELS_PATH.exists():
            raise HTTPException(status_code=500, detail=f"models.json not found at {MODELS_PATH}")
        data = json.loads(MODELS_PATH.read_text())
        if isinstance(data, dict) and "models" in data:
            return data["models"]
        return data

    @router.get("")
    async def get_all_models() -> list[dict]:
        return _load_models()

    @router.get("/by-type/{component_type}")
    async def get_models_by_type(component_type: str) -> list[dict]:
        models = _load_models()
        comp = component_type.upper()
        if comp not in ("EMB", "GEN", "RERANK"):
            raise HTTPException(status_code=400, detail="Invalid component_type")
        return [m for m in models if comp in m.get("components", [])]
    ```

!!! danger "Breaking change risk"
    If you rename or remove a model entry that is already referenced by saved configuration, the UI may still load but runtime selection can fail. Prefer deprecating via `notes` first, then removing later.

---

## How configuration references models (Pydantic is the law)

Runtime configuration lives in `server/models/tribrid_config_model.py` under `TriBridConfigRoot`. Model selection fields include:

- `embedding.embedding_type`, `embedding.embedding_model`, `embedding.embedding_dim`
- `generation.gen_model`, plus backend-specific overrides (Ollama, HTTP, MCP)
- `reranking.reranker_mode` and reranker model/provider fields

!!! note "Dynamic validation"
    `EmbeddingConfig.embedding_type` is described as “validated against models.json at runtime”.  
    The intent is: **models.json defines what’s selectable**, and config chooses among those options.

---

## Frontend usage: `useModels` hook

The frontend should treat `/api/models` as the only source of model options. The typical flow is:

1. Call `GET /api/models` once (or cache it)
2. Derive:
   - Provider lists
   - Component-specific lists (EMB/GEN/RERANK)
   - Display labels (often `family` + `model`)
3. Populate dropdowns and persist the selected `model` string into configuration

??? note "Click to expand: expected hook responsibilities"
    - Fetch `/api/models`
    - Provide helpers like:
        - `getByType("EMB" | "GEN" | "RERANK")`
        - `getProviders()`
        - `getByProvider(provider)`
    - Keep UI logic free of hardcoded provider/model assumptions

=== "TypeScript"
    ```typescript linenums="1" hl_lines="1 6 18 23"
    type ModelComponent = "EMB" | "GEN" | "RERANK";

    export type ModelDef = {
      provider: string;
      family: string;
      model: string;
      components: ModelComponent[];
      unit?: string;
      input_per_1k?: number;
      output_per_1k?: number;
      embed_per_1k?: number;
      rerank_per_1k?: number;
      per_request?: number;
      context?: number;
      dimensions?: number;
      notes?: string;
    };

    export async function fetchModels(): Promise<ModelDef[]> {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to load models");
      return (await res.json()) as ModelDef[];
    }

    export function filterByType(models: ModelDef[], t: ModelComponent): ModelDef[] {
      return models.filter(m => (m.components ?? []).includes(t));
    }
    ```

!!! warning "TypeScript types are generated"
    In TriBridRAG, **TypeScript types are generated from Pydantic** (never hand-written).  
    The snippet above illustrates shape/usage only; in the actual codebase, prefer the generated types and keep the hook thin.

---

## Architecture: where models fit

```mermaid
flowchart LR
  A[data/models.json<br/>Model registry] --> B[FastAPI<br/>/api/models]
  B --> C[Frontend useModels hook<br/>dropdowns + selection]
  C --> D[tribrid_config.json<br/>selected model IDs]
  D --> E[TriBridConfigRoot (Pydantic)<br/>server/models/tribrid_config_model.py]
  E --> F[Runtime components<br/>Embedding / Generation / Reranking]
```

!!! tip "Operational checklist"
    - Add model to `data/models.json`
    - Confirm it appears in `GET /api/models/by-type/...`
    - Select it in the UI (via `useModels`)
    - Ensure config references the `model` string exactly
    - Rebuild indexes if embedding dimensions changed