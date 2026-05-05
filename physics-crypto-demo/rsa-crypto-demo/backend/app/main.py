from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.routers import rsa_router, history_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RSA 密码学算法演示系统 - 用于教学演示 RSA 密钥生成、加密解密过程",
    version=settings.VERSION,
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(rsa_router)
app.include_router(history_router)


@app.get("/", summary="根路径")
async def root():
    return {
        "message": "欢迎使用 RSA 密码学算法演示系统",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }


@app.get("/health", summary="健康检查")
async def health_check():
    return {"status": "healthy", "service": "RSA Crypto Demo"}
