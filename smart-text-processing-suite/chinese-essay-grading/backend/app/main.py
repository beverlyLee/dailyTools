from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db
from .routers import essays, grading, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"正在启动 {settings.PROJECT_NAME}...")
    print(f"版本: {settings.PROJECT_VERSION}")
    
    try:
        init_db()
        print("数据库初始化完成")
    except Exception as e:
        print(f"数据库初始化警告: {e}")
    
    yield
    
    print(f"{settings.PROJECT_NAME} 已关闭")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="中文作文智能批改系统 - 集成 THUNLP/LTP 模型，实现作文自动评分、错误检测和句法分析",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    essays.router,
    prefix="/api/essays",
    tags=["作文管理"]
)

app.include_router(
    grading.router,
    prefix="/api/gradings",
    tags=["作文批改"]
)

app.include_router(
    analysis.router,
    prefix="/api/analysis",
    tags=["学情分析"]
)


@app.get("/")
def root():
    return {
        "message": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }


@app.get("/api/config")
def get_config():
    return {
        "success": True,
        "data": {
            "project_name": settings.PROJECT_NAME,
            "version": settings.PROJECT_VERSION,
            "debug": settings.DEBUG,
            "nlp_engine": settings.NLP_ENGINE,
            "max_essay_length": settings.MAX_ESSAY_LENGTH
        }
    }
