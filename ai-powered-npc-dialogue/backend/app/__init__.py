from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dialogue
from app.config import settings

app = FastAPI(
    title="AI-Powered NPC Dialogue System",
    description="一个基于AI的NPC对话系统，支持上下文记忆和RAG检索",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dialogue.router, prefix="/api/v1", tags=["Dialogue"])

@app.get("/")
async def root():
    return {"message": "AI-Powered NPC Dialogue System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
