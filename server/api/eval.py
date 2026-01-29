from fastapi import APIRouter
from typing import Any

from server.models.eval import EvalRequest, EvalRun

router = APIRouter(tags=["eval"])


@router.post("/eval/run", response_model=EvalRun)
async def run_evaluation(request: EvalRequest) -> EvalRun:
    raise NotImplementedError


@router.get("/eval/runs", response_model=list[EvalRun])
async def list_eval_runs(repo_id: str | None = None, limit: int = 20) -> list[EvalRun]:
    raise NotImplementedError


@router.get("/eval/run/{run_id}", response_model=EvalRun)
async def get_eval_run(run_id: str) -> EvalRun:
    raise NotImplementedError


@router.delete("/eval/run/{run_id}")
async def delete_eval_run(run_id: str) -> dict[str, Any]:
    raise NotImplementedError
