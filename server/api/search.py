from fastapi import APIRouter
from starlette.responses import StreamingResponse

from server.models.retrieval import AnswerRequest, AnswerResponse, SearchRequest, SearchResponse

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    raise NotImplementedError


@router.post("/answer", response_model=AnswerResponse)
async def answer(request: AnswerRequest) -> AnswerResponse:
    raise NotImplementedError


@router.post("/answer/stream")
async def answer_stream(request: AnswerRequest) -> StreamingResponse:
    raise NotImplementedError
