from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.routers import rsa_router, calculator_router, crypto_router, history_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RSA 密码学算法演示应用后端 API",
    version="1.0.0",
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
app.include_router(calculator_router)
app.include_router(crypto_router)
app.include_router(history_router)


@app.get("/", summary="根路径")
async def root():
    return {
        "message": "欢迎使用 RSA 密码学算法演示应用",
        "version": "1.0.0",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }


@app.get("/health", summary="健康检查")
async def health_check():
    return {"status": "healthy"}
