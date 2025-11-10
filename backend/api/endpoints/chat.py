from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from langchain.schema import HumanMessage
from models.chat import ChatRequest, ChatResponse, StreamResponse
from agents.qa_agent import QAAgent
from supabase import create_client
from datetime import datetime
import os
import uuid
import asyncio
import json

#almost
router = APIRouter(prefix="/chat")
agent = QAAgent()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def _get_current_time():
    try:
        return datetime.now().strftime("%H:%M:%S")
    except Exception:
        return ""

def check_conversation_id(request: ChatRequest):
    if not request.conversation_id:
        conversation_result = supabase.table("conversations").insert({
            "title": request.message[:50]
        }).execute()
        conversation_id = conversation_result.data[0]["id"]
        print(f"--- [CHAT][{_get_current_time()}]: created new conversation: {conversation_id}")
        return conversation_id
    else:
        return request.conversation_id

def store_user_message(request: ChatRequest, conversation_id):
    supabase.table("message").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": request.message
    }).execute()

def store_assistant_message(content: str, citations: list, conversation_id: str):
    result = supabase.table("message").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": content,
        "citations": citations
    }).execute()
    return result.data[0]["id"] if result.data else None


@router.post("/")
async def chat_endpoint(request: ChatRequest):
    print(f"--- [CHAT][{_get_current_time()}]: got request: {request.message}")

    conversation_id = check_conversation_id(request) 
    store_user_message(request, conversation_id)

    result = agent.generate_response(request.message, request.history)
    store_assistant_message(result["content"], result["citations"], conversation_id) 

    print(f"--- [CHAT][{_get_current_time()}]: ai response is ready")

    return {
        "content": result["content"],
        "citations": result["citations"],
        "conversation_id": conversation_id
    }

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    conversation_id = check_conversation_id(request)
    store_user_message(request, conversation_id)
    async def generate():
        result = agent.generate_response(request.message, request.history)
        #store_assistant_message(result, conversation_id)²
        yield f"data"

    return StreamingResponse(generate(), media_type="application/json")
