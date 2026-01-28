from fastapi import APIRouter

router = APIRouter(tags=["reranker"])


@router.get("/reranker/status")
async def get_reranker_status() -> dict:
    raise NotImplementedError


@router.get("/reranker/triplets/{repo_id}", response_model=list[dict])
async def get_triplets(repo_id: str, limit: int = 100) -> list[dict]:
    raise NotImplementedError


@router.post("/reranker/triplets/{repo_id}")
async def add_triplet(repo_id: str, query: str, positive: str, negative: str) -> dict:
    raise NotImplementedError


@router.post("/reranker/train")
async def train_reranker(repo_id: str | None = None) -> dict:
    raise NotImplementedError


@router.post("/reranker/promote")
async def promote_model(model_path: str) -> dict:
    raise NotImplementedError
