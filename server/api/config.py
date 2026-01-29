from fastapi import APIRouter
from typing import Any

from server.models.config import TriBridConfig

router = APIRouter(tags=["config"])


@router.get("/config", response_model=TriBridConfig)
async def get_config() -> TriBridConfig:
    raise NotImplementedError


@router.put("/config", response_model=TriBridConfig)
async def update_config(config: TriBridConfig) -> TriBridConfig:
    raise NotImplementedError


@router.patch("/config/{section}", response_model=TriBridConfig)
async def update_config_section(section: str, updates: dict[str, Any]) -> TriBridConfig:
    raise NotImplementedError


@router.post("/config/reset", response_model=TriBridConfig)
async def reset_config() -> TriBridConfig:
    raise NotImplementedError
