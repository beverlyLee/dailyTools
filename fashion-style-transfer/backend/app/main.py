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
    images_router,
    style_transfer_router,
    history_router,
    download_router,
    health_router,
)
from .services import init_services


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 国风服饰虚拟换装系统启动 ===")
    logger.info(f"运行环境: {'调试模式' if settings.DEBUG else '生产模式'}")
    logger.info(f"设备: {settings.DEVICE}")

    try:
        logger.info("初始化数据库...")
        await init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.warning(f"数据库初始化失败（将使用模拟模式）: {e}")

    try:
        logger.info("初始化服务...")
        init_services()
        logger.info("服务初始化完成")
    except Exception as e:
        logger.warning(f"服务初始化失败: {e}")

    logger.info("=== 系统启动完成 ===")

    yield

    logger.info("=== 系统关闭中... ===")


app = FastAPI(
    title="国风服饰虚拟换装 API",
    description="""
    基于 ControlNet 的国风服饰虚拟换装系统 API。

    主要功能：
    - 图片上传与关键点检测
    - ControlNet 风格迁移（汉服、旗袍等）
    - 局部重绘与细节调整
    - PNG 高清下载
    - 创作历史记录

    技术架构：
    - 后端：FastAPI + SQLAlchemy
    - AI：ControlNet + Stable Diffusion + MediaPipe
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
        "name": "国风服饰虚拟换装 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


app.include_router(images_router)
app.include_router(style_transfer_router)
app.include_router(history_router)
app.include_router(download_router)
app.include_router(health_router)
