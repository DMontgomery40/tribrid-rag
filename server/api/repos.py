from fastapi import APIRouter

from server.models.repo import RepoStats, Repository

router = APIRouter(tags=["repos"])


@router.get("/repos", response_model=list[Repository])
async def list_repos() -> list[Repository]:
    raise NotImplementedError


@router.post("/repos", response_model=Repository)
async def add_repo(repo: Repository) -> Repository:
    raise NotImplementedError


@router.get("/repos/{repo_id}", response_model=Repository)
async def get_repo(repo_id: str) -> Repository:
    raise NotImplementedError


@router.get("/repos/{repo_id}/stats", response_model=RepoStats)
async def get_repo_stats(repo_id: str) -> RepoStats:
    raise NotImplementedError


@router.delete("/repos/{repo_id}")
async def delete_repo(repo_id: str) -> dict:
    raise NotImplementedError
