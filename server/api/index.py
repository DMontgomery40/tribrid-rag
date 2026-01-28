from fastapi import APIRouter

from server.models.index import IndexRequest, IndexStats, IndexStatus

router = APIRouter(tags=["index"])


@router.post("/index", response_model=IndexStatus)
async def start_index(request: IndexRequest) -> IndexStatus:
    raise NotImplementedError


@router.get("/index/{repo_id}/status", response_model=IndexStatus)
async def get_index_status(repo_id: str) -> IndexStatus:
    raise NotImplementedError


@router.get("/index/{repo_id}/stats", response_model=IndexStats)
async def get_index_stats(repo_id: str) -> IndexStats:
    raise NotImplementedError


@router.delete("/index/{repo_id}")
async def delete_index(repo_id: str) -> dict:
    raise NotImplementedError
