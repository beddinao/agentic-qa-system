from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class MessageRole(str, Enum):
    User = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    role: MessageRole
    content: str

class Citation(BaseModel):
    source: str
    content: str
    confidence: float

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    content: str
    citations: List[Citation]
    conversation_id: str
    message_id: Optional[str] = None

class StreamResponse(BaseModel):
    type: str
    data: Dict[str, Any]

