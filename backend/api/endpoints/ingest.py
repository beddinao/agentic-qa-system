from fastapi import APIRouter, BackgroundTasks
from models.ingestion import IngestionRequest, IngestionResponse
from services.ingestion_service import IngestionService
from supabase import create_client
from dotenv import load_dotenv
import os
import uuid

load_dotenv()

#there we go
router = APIRouter(prefix="/ingest")
ingestion_service = IngestionService()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

@router.post("/", response_model=IngestionResponse)
async def ingest_documents(request: IngestionRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())

    supabase.table("ingestion_jobs").insert({
        "id": job_id,
        "source_url": request.source_url,
        "status": "pending"
    }).execute()

    background_tasks.add_task(
        ingestion_service.process_documents, #routine
        request.source_url,
        job_id
    )

    return IngestionResponse(
        job_id=job_id,
        status="pending",
        message="ingection done"
    )

@router.get("/status/{job_id}")
async def get_ingestion_status(job_id: str):
    result = supabase.table("ingestion_jobs").select("*").eq("id", job_id).execute()
    if result.data:
        return result.data[0]
    return {"error": "no job with that id"}
