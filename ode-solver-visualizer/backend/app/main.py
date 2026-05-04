from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from loguru import logger
import sys

from .config import settings
from .database import init_db
from .routers import ode_router, parameter_scan_router
from .routers.ode_router import router as ode_router_instance
from .routers.parameter_scan_router import router as param_scan_router_instance


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 常微分方程数值解可视化系统启动 ===")
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
    title="常微分方程数值解可视化 API",
    description="""
    常微分方程数值解可视化系统 API。

    主要功能：
    - 经典ODE方程求解（洛伦兹吸引子、捕食者-猎物模型等）
    - 多种数值求解方法（欧拉法、龙格-库塔法 RK4、自适应步长 RK45）
    - 相平面图和相空间图可视化
    - 庞加莱截面分析
    - 参数扫描功能，数据存入 SQLite

    技术架构：
    - 后端：FastAPI + SQLAlchemy + SciPy + NumPy
    - 数值方法：欧拉法、龙格-库塔法
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


app.include_router(ode_router_instance)
app.include_router(param_scan_router_instance)
