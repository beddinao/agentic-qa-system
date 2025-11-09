from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.endpoints.ingest import router as ingest_router
from api.endpoints.chat import router as chat_router

load_dotenv()

app = FastAPI(
    title="Agentic Q&A System",
    description="micro-services Q&A system: data-ingestion/chat",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router, prefix="/api", tags=["Ingestion"])
app.include_router(chat_router, prefix="/api", tags=["Chat"])

@app.get("/")
async def root():
    return {
            "message": "Agentic Q&A System Backend",
            "status": "running",
            "avai_endpoins": {
                "data_ingestion": "/api/ingest",
                "check_ingestion_status": "/api/ingest/status/{job_id}",
                "chat": "/api/chat",
                "health": "/health"
            }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthier than ever", "service": "agentic-qa-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("BACKEND_PORT", 8000)))
