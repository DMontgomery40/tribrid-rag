"""API endpoints for model definitions.

This module serves models.json - THE source of truth for all model selection
in the UI. Every dropdown (embedding, generation, reranker) MUST use this endpoint.

NO HARDCODED MODEL LISTS ANYWHERE ELSE.

Note:
- The catalog is primarily static (data/models.json), but we may *augment* it at
  request time with config-derived, runtime-only models (e.g. ragweld) so the UI
  stays "lawful" without special-casing.
"""

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from server.models.tribrid_config_model import CorpusScope
from server.services.config_store import CorpusNotFoundError
from server.services.config_store import get_config as load_scoped_config

router = APIRouter(prefix="/api/models", tags=["models"])

MODELS_PATH = Path(__file__).parent.parent.parent / "data" / "models.json"

logger = logging.getLogger(__name__)

# Ruff B008: avoid function calls in argument defaults (FastAPI Depends()).
_CORPUS_SCOPE_DEP = Depends()


async def _resolve_ragweld_base_model(scope: CorpusScope | None) -> str | None:
    repo_id: str | None = None
    try:
        repo_id = scope.resolved_repo_id if scope is not None else None
    except Exception:
        repo_id = None

    cfg = None
    if repo_id:
        try:
            cfg = await load_scoped_config(repo_id=repo_id)
        except CorpusNotFoundError as e:
            # Don't break clients if a UI passes a stale corpus id.
            logger.warning("models catalog: corpus not found for scope repo_id=%s (%s)", repo_id, e)
            cfg = None
        except Exception as e:
            logger.warning("models catalog: failed to load scoped config for repo_id=%s (%s)", repo_id, e)
            cfg = None

    if cfg is None:
        try:
            cfg = await load_scoped_config(repo_id=None)
        except Exception as e:
            logger.warning("models catalog: failed to load global config (%s)", e)
            return None

    base = str(getattr(getattr(cfg, "training", None), "ragweld_agent_base_model", "") or "").strip()
    if base.startswith("ragweld:"):
        base = base.split(":", 1)[1].strip()
    return base or None


def _augment_catalog_with_ragweld(catalog: dict[str, Any], ragweld_base_model: str | None) -> dict[str, Any]:
    if not ragweld_base_model:
        return catalog

    model_id = f"ragweld:{ragweld_base_model}"
    models = catalog.get("models")
    if not isinstance(models, list):
        models = []
        catalog["models"] = models

    for m in models:
        if isinstance(m, dict) and str(m.get("model") or "") == model_id:
            return catalog

    models.append(
        {
            "provider": "ragweld",
            "family": ragweld_base_model,
            "model": model_id,
            "components": ["GEN"],
            # Required by /api/models contract tests; 0 means "unknown" (UI treats it as falsy).
            "context": 0,
            "unit": "1k_tokens",
            "input_per_1k": 0.0,
            "output_per_1k": 0.0,
            "notes": "Ragweld in-process MLX model (Qwen3 base + hot-swappable LoRA adapter; context unknown)",
        }
    )
    return catalog


def _load_catalog() -> dict[str, Any]:
    """Load the full models.json catalog.

    models.json is a dict with metadata + a `models` list. The UI expects the
    full object at GET /api/models.
    """
    if not MODELS_PATH.exists():
        raise HTTPException(status_code=500, detail=f"models.json not found at {MODELS_PATH}")
    data: Any = json.loads(MODELS_PATH.read_text())
    if isinstance(data, dict):
        return data
    # Backward-compat: allow a raw list file, wrap it.
    if isinstance(data, list):
        return {"models": data}
    return {"models": []}


def _catalog_models(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    models = catalog.get("models")
    if isinstance(models, list):
        return [m for m in models if isinstance(m, dict)]
    return []


@router.get("")
async def get_all_models(scope: CorpusScope = _CORPUS_SCOPE_DEP) -> dict[str, Any]:
    """
    Return the full models.json catalog (metadata + models list).

    This is THE source of truth for all model selection in the UI.
    Every dropdown (embedding, generation, reranker) MUST use this endpoint.
    """
    catalog = _load_catalog()
    base = await _resolve_ragweld_base_model(scope)
    return _augment_catalog_with_ragweld(catalog, base)


@router.get("/by-type/{component_type}")
async def get_models_by_type(component_type: str, scope: CorpusScope = _CORPUS_SCOPE_DEP) -> list[dict[str, Any]]:
    """
    Return models filtered by component type.

    Args:
        component_type: One of EMB, GEN, RERANK (case-insensitive)

    Returns:
        List of models that support the given component type
    """
    catalog = _load_catalog()
    base = await _resolve_ragweld_base_model(scope)
    _augment_catalog_with_ragweld(catalog, base)
    models = _catalog_models(catalog)
    comp = component_type.upper()
    if comp not in ("EMB", "GEN", "RERANK"):
        raise HTTPException(status_code=400, detail=f"Invalid component_type: {component_type}. Must be EMB, GEN, or RERANK")
    return [m for m in models if comp in m.get("components", [])]


@router.get("/providers")
async def get_providers(scope: CorpusScope = _CORPUS_SCOPE_DEP) -> list[str]:
    """Return unique list of providers, sorted alphabetically."""
    catalog = _load_catalog()
    base = await _resolve_ragweld_base_model(scope)
    _augment_catalog_with_ragweld(catalog, base)
    models = _catalog_models(catalog)
    providers = sorted(set(str(m.get("provider", "unknown")) for m in models))
    return providers


@router.get("/providers/{provider}")
async def get_models_for_provider(provider: str, scope: CorpusScope = _CORPUS_SCOPE_DEP) -> list[dict[str, Any]]:
    """Return all models for a specific provider."""
    catalog = _load_catalog()
    base = await _resolve_ragweld_base_model(scope)
    _augment_catalog_with_ragweld(catalog, base)
    models = _catalog_models(catalog)
    return [m for m in models if m.get("provider", "").lower() == provider.lower()]
