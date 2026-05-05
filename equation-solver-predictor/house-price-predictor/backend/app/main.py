from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from loguru import logger
import sys
import os

from .config import settings
from .database import init_db
from .routers.prediction_router import router as prediction_router
from .routers.model_router import router as model_router

os.makedirs(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
os.makedirs(os.path.dirname(settings.MODEL_FILE_PATH), exist_ok=True)
os.makedirs(os.path.dirname(settings.DATA_FILE_PATH), exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 房价走势线性回归预测器启动 ===")
    logger.info(f"运行环境: {'调试模式' if settings.DEBUG else '生产模式'}")

    try:
        logger.info("初始化数据库...")
        init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.warning(f"数据库初始化失败: {e}")

    logger.info("=== 系统启动完成 ===")

    yield

    logger.info("=== 系统关闭中... ===")


app = FastAPI(
    title="房价走势线性回归预测器 API",
    description="""
    房价走势线性回归预测器 API。

    主要功能：
    - 加载国内某城市的历史房价及影响因素（GDP、人口、利率等）CSV 数据集
    - 后端进行数据清洗、归一化，并训练多元线性回归模型
    - 前端提供交互式滑块调整影响因素数值实时预测房价
    - 可视化展示特征重要性系数、拟合直线与实际房价的残差分布
    - 模型参数存入 SQLite

    技术架构：
    - 后端：FastAPI + SQLAlchemy + Scikit-learn + Pandas
    - 机器学习：多元线性回归
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["健康检查"])
async def health_check():
    return {"status": "healthy"}


app.include_router(prediction_router)
app.include_router(model_router)
