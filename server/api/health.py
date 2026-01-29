from fastapi import APIRouter
from typing import Any
from starlette.responses import Response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, Any]:
    raise NotImplementedError


@router.get("/ready")
async def readiness_check() -> dict[str, Any]:
    raise NotImplementedError


@router.get("/metrics")
async def prometheus_metrics() -> Response:
    raise NotImplementedError
