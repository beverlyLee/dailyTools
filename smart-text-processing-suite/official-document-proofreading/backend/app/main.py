from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from .config import settings
from .database import init_db, engine
from .models import Base
from .routers import documents, proofread


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"正在初始化 {settings.PROJECT_NAME}...")
    print(f"数据库: {settings.DATABASE_URL}")
    
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.VERSIONS_DIR, exist_ok=True)
    
    Base.metadata.create_all(bind=engine)
    
    print(f"{settings.PROJECT_NAME} 初始化完成!")
    
    yield
    
    print(f"{settings.PROJECT_NAME} 正在关闭...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="公文写作智能校对系统 - 支持政治术语检测、固定搭配检查、格式规范校验和润色建议",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(proofread.router)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "running",
        "description": "公文写作智能校对系统 API 服务"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "official-document-proofreading"
    }


@app.get("/config")
def get_config():
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": "SQLite",
        "max_document_length": settings.MAX_DOCUMENT_LENGTH,
        "use_bert_model": settings.USE_BERT_MODEL,
        "bert_model_path": settings.BERT_MODEL_PATH
    }


@app.get("/api/info")
def get_api_info():
    return {
        "service": "公文写作智能校对系统",
        "version": settings.PROJECT_VERSION,
        "endpoints": {
            "documents": "/api/documents - 文档管理",
            "proofread": "/api/proofread - 校对服务",
            "format": "/api/proofread/format/check - 格式检查"
        },
        "features": [
            "政治术语使用检测",
            "固定搭配错误检测",
            "标点符号误用检测",
            "红头文件格式规范性检查",
            "口语化表达润色建议",
            "版本管理与回溯"
        ]
    }
