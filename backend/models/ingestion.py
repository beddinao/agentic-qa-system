from pydantic import BaseModel
from typing import Optional
from enum import Enum


class IngestionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class IngestionRequest(BaseModel):
    source_url: str

class IngestionResponse(BaseModel):
    job_id: str
    status: IngestionStatus
    message: str
