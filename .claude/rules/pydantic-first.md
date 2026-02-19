---
paths:
  - "server/**/*.py"
---

# Pydantic-First Rules (Python/Server)

## Rule 1: Pydantic First
Before adding ANY feature:
1. Add the field to `tribrid_config_model.py` with proper `Field()` constraints
2. Run `uv run scripts/generate_types.py` to regenerate TypeScript
3. THEN implement the feature

**WRONG:** Add behavior, then figure out where to store the value
**RIGHT:** Add to Pydantic -> generate types -> implement

## Rule 3: No Adapters/Transformers
If the backend returns shape A and the frontend expects shape B:
- **WRONG:** Write an adapter function to convert A -> B
- **RIGHT:** Change the Pydantic model to return shape B

Adapters are technical debt. Fix the source.

## Rule 4: Config Controls Everything
Every behavior that could vary must be controlled by config:
- Thresholds -> `tribrid_config_model.py`
- Feature flags -> `tribrid_config_model.py`
- Model selection -> `data/models.json`
- Tooltips -> `data/glossary.json`

**WRONG:** Hardcode `if score > 0.5`
**RIGHT:** `if score > config.retrieval.confidence_threshold`

## Rule 5: Field Constraints Are Law
```python
rrf_k: int = Field(default=60, ge=1, le=200, description="RRF smoothing")
```
- UI slider MUST have min=1, max=200
- API MUST reject values outside [1, 200]
- Default MUST be 60

## Banned Python Imports
```python
# BANNED - we don't use these
from qdrant_client import ...     # Use pgvector
import qdrant_client             # Use pgvector
from redis import ...            # Removed
import redis                     # Removed
from langchain import ...        # Banned (use langgraph directly)
import langchain                 # Banned (use langgraph directly)
```
LangGraph IS allowed — use it directly, not through LangChain wrappers.

## Architecture Smells (BANNED)
- `class *Adapter` -> Fix the Pydantic model instead
- `class *Transformer` -> Fix the Pydantic model instead
- `class *Mapper` -> Fix the Pydantic model instead
- `function transform*` -> Fix the Pydantic model instead
