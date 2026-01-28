from fastapi import APIRouter

from server.models.cost import CostEstimate, CostRecord, CostSummary

router = APIRouter(tags=["cost"])


@router.post("/cost/estimate", response_model=CostEstimate)
async def estimate_cost(operation: str, token_count: int) -> CostEstimate:
    raise NotImplementedError


@router.get("/cost/history", response_model=list[CostRecord])
async def get_cost_history(period: str = "week") -> list[CostRecord]:
    raise NotImplementedError


@router.get("/cost/summary", response_model=CostSummary)
async def get_cost_summary(period: str = "month") -> CostSummary:
    raise NotImplementedError
