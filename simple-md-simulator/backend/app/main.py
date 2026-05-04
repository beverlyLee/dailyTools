from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from loguru import logger
from typing import Dict, Any
import sys

from .config import settings
from .database import init_db
from .routers import (
    simulation_router,
    trajectory_router,
    health_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 分子动力学模拟系统启动 ===")
    logger.info(f"运行环境: {'调试模式' if settings.DEBUG else '生产模式'}")
    
    try:
        logger.info("初始化数据库...")
        await init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.warning(f"数据库初始化失败: {e}")
    
    logger.info("=== 系统启动完成 ===")
    
    yield
    
    logger.info("=== 系统关闭中... ===")


app = FastAPI(
    title="分子动力学模拟器 API",
    description="""
    基于 Lennard-Jones 势和 Velocity-Verlet 算法的分子动力学模拟系统。

    主要功能：
    - 创建 FCC 晶格结构，定义原子初始位置和速度
    - 实现 Lennard-Jones 势函数计算原子间作用力
    - 使用 Velocity-Verlet 算法更新原子状态
    - 模拟体系的温度、压力、势能/动能变化
    - 验证微正则系综下的能量守恒
    - 原子轨迹数据存入 SQLite，支持轨迹回放

    技术架构：
    - 后端：FastAPI + SQLAlchemy + SQLite
    - MD 引擎：自定义 Python 实现
    - 前端：Three.js 进行 3D 原子渲染
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"请求验证错误: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "请求参数错误",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"未处理的异常: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "服务器内部错误",
            "message": str(exc) if settings.DEBUG else "请稍后重试",
        },
    )


@app.get("/", tags=["根路径"])
async def root():
    return {
        "name": "分子动力学模拟器 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


app.include_router(simulation_router)
app.include_router(trajectory_router)
app.include_router(health_router)
