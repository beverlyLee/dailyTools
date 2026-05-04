from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import init_db
from app.routers import chat, documents, tickets

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Smart Chatbot Service",
    description="企业智能客服工单系统 - 基于RAG的智能客服与工单管理",
    version="1.0.0",
    lifespan=lifespan
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])

@app.get("/")
async def root():
    return {
        "message": "Smart Chatbot Service is running",
        "version": "1.0.0",
        "features": [
            "RAG-based Intelligent Chat",
            "Intent Recognition",
            "Automatic Ticket Generation",
            "FAISS Vector Store",
            "PostgreSQL Persistence"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/info")
async def get_system_info():
    return {
        "model": settings.ollama_model,
        "embedding_model": settings.embedding_model,
        "faiss_index_path": settings.faiss_index_path,
        "intent_threshold": settings.intent_threshold
    }
