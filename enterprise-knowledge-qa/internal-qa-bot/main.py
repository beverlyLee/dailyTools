from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.api import documents_router, qa_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.app_name} v{settings.version}...")
    print(f"LLM type: {settings.llm_type}")
    print(f"Vector store: {settings.chroma_db_path}")
    
    yield
    
    print(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="企业知识库与问答助手 - 智能文档管理与语义搜索系统",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(documents_router, prefix="/api/v1")
app.include_router(qa_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.version,
        "status": "running",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.version,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
