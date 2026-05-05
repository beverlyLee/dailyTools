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
    solver_router,
    examples_router,
    health_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 纳什均衡求解器系统启动 ===")
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
    title="纳什均衡求解器 API",
    description="""
    双人博弈纳什均衡求解器系统。

    主要功能：
    - 用户通过表格输入双人博弈的收益矩阵
    - 后端算法自动求解纯策略纳什均衡和混合策略纳什均衡（Support Enumeration 算法）
    - 计算该策略下的期望收益
    - 提供经典的博弈案例模板（如囚徒困境、性别之战）
    - 数据存入 SQLite

    技术架构：
    - 后端：FastAPI + SQLAlchemy + SQLite
    - 求解器：Nashpy 库 + 手动实现的 2x2 博弈备选方案
    - 前端：React + AG-Grid 构建可视化界面
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


app.include_router(health_router)
app.include_router(solver_router)
app.include_router(examples_router)
