from fastapi import APIRouter
from fastapi.responses import StreamingResponse
#from models.chat import ChatRequest, ChatResponse
#from agents.qa_agent import QAAgent
from supabase import create_client
import os
import uuid
import json

#almost
router = APIRouter(prefix="/chat")
#agent = QQAgent()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

@router.post("/")
async def chat_endpoint():
    return "THERE!, your answer"

@router.post("/stream")
async def chat_stream():
    return "THERE!, your answer"
