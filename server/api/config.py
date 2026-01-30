from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Query
from typing import Any

from server.config import load_config, save_config
from server.models.tribrid_config_model import TriBridConfig

router = APIRouter(tags=["config"])

# In-memory cache (source of truth is tribrid_config.json)
_config_cache: TriBridConfig | None = None


def _get_default_config() -> TriBridConfig:
    """Get default config - LAW provides all defaults via default_factory."""
    return TriBridConfig()


def _load_or_init_config() -> TriBridConfig:
    """Load config from disk; initialize defaults if missing/invalid."""
    global _config_cache
    if _config_cache is not None:
        return _config_cache
    try:
        _config_cache = load_config()
        return _config_cache
    except FileNotFoundError:
        _config_cache = _get_default_config()
        save_config(_config_cache)
        return _config_cache
    except Exception as e:
        # Surface validation errors clearly (Pydantic will raise)
        raise HTTPException(status_code=500, detail=f"Failed to load tribrid_config.json: {e}")


@router.get("/config", response_model=TriBridConfig)
async def get_config() -> TriBridConfig:
    return _load_or_init_config()


@router.put("/config", response_model=TriBridConfig)
async def update_config(config: TriBridConfig) -> TriBridConfig:
    global _config_cache
    # Persist full config to disk
    save_config(config)
    _config_cache = config
    return config


@router.patch("/config/{section}", response_model=TriBridConfig)
async def update_config_section(section: str, updates: dict[str, Any]) -> TriBridConfig:
    global _config_cache
    config = _load_or_init_config()

    # Only allow patching known top-level sections
    if section not in TriBridConfig.model_fields:
        raise HTTPException(status_code=404, detail=f"Unknown config section: {section}")

    # Build a new config dict with patched section and re-validate (ensures Field constraints apply)
    base = config.model_dump()
    current_section = base.get(section)
    if not isinstance(current_section, dict):
        raise HTTPException(status_code=400, detail=f"Config section '{section}' is not patchable")
    if not isinstance(updates, dict):
        raise HTTPException(status_code=422, detail="PATCH body must be a JSON object")

    merged = {**current_section, **updates}
    base[section] = merged

    try:
        new_config = TriBridConfig.model_validate(base)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    save_config(new_config)
    _config_cache = new_config
    return new_config


@router.post("/config/reset", response_model=TriBridConfig)
async def reset_config() -> TriBridConfig:
    global _config_cache
    cfg = _get_default_config()
    save_config(cfg)
    _config_cache = cfg
    return cfg


@router.get("/secrets/check")
async def check_secrets(keys: str = Query(..., description="Comma-separated env var names")) -> dict[str, bool]:
    """Return which secret env vars are configured (never returns values)."""
    names = [k.strip() for k in (keys or "").split(",") if k.strip()]
    return {name: bool(os.getenv(name)) for name in names}
