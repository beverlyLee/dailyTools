from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.models import DatabaseManager
from app.routers import simulation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_manager = DatabaseManager()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="流体动力学模拟器 - 基于 Lattice Boltzmann Method (D2Q9 模型) 的 CFD 模拟系统",
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


app.include_router(simulation_router)


@app.get("/", summary="根路径")
async def root():
    return {
        "message": "欢迎使用流体动力学模拟器",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "openapi_url": "/openapi.json"
    }


@app.get("/health", summary="健康检查")
async def health_check():
    return {"status": "healthy", "service": "Fluid Dynamics Simulator"}
