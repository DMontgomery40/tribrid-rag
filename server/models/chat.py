from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from server.models.retrieval import ChunkMatch


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    message: str
    repo_id: str
    conversation_id: str | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    conversation_id: str
    message: Message
    sources: list[ChunkMatch]
    tokens_used: int
