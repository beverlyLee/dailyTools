from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import proofreader, documents

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="公文写作智能校对系统 - 利用规则引擎和AI模型进行公文校对"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    proofreader.router,
    prefix="/api/proofreader",
    tags=["校对服务"]
)

app.include_router(
    documents.router,
    prefix="/api/documents",
    tags=["文档管理"]
)

@app.get("/")
def root():
    return {
        "message": "公文写作智能校对系统",
        "version": settings.PROJECT_VERSION,
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
