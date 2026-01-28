from fastapi import APIRouter
from starlette.responses import StreamingResponse

from server.models.chat import ChatRequest, ChatResponse, Message

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    raise NotImplementedError


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    raise NotImplementedError


@router.get("/chat/history/{conversation_id}", response_model=list[Message])
async def get_chat_history(conversation_id: str) -> list[Message]:
    raise NotImplementedError


@router.delete("/chat/history/{conversation_id}")
async def clear_chat_history(conversation_id: str) -> dict:
    raise NotImplementedError
