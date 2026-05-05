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
    game_solver_router,
    game_examples_router,
)
from .routers.game_examples import init_examples
from .database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== 物理模拟与博弈论求解平台启动 ===")
    logger.info(f"运行环境: {'调试模式' if settings.DEBUG else '生产模式'}")
    
    try:
        logger.info("初始化数据库...")
        await init_db()
        logger.info("数据库初始化完成")
        
        logger.info("初始化博弈示例...")
        try:
            db = SessionLocal()
            init_examples(db)
            db.close()
            logger.info("博弈示例初始化完成")
        except Exception as e:
            logger.warning(f"博弈示例初始化失败: {e}")
        
    except Exception as e:
        logger.warning(f"初始化失败: {e}")
    
    logger.info("=== 系统启动完成 ===")
    
    yield
    
    logger.info("=== 系统关闭中... ===")


app = FastAPI(
    title="物理模拟与博弈论求解平台",
    description="""
    集成分子动力学模拟与博弈论求解综合平台。

    主要功能：
    
    物理模拟：
    - 定义原子类型、质量、初始位置和速度
    - 构建简单晶格结构（FCC/SC/BCC）
    - 实现 Lennard-Jones 势函数计算原子间作用力
    - 使用 Velocity-Verlet 算法更新原子状态
    - 模拟体系的温度、压力、势能/动能变化
    - 验证微正则系综下的能量守恒
    - 原子轨迹数据存入 SQLite，支持轨迹回放
    
    博弈论求解器：
    - 用户通过表格输入双人博弈的收益矩阵
    - 自动求解纯策略纳什均衡和混合策略纳什均衡（Support Enumeration 算法）
    - 高亮显示均衡策略组合并计算期望收益
    - 提供经典博弈案例模板
    - 数据存入 SQLite

    技术架构：
    - 后端：FastAPI + SQLAlchemy + SQLite
    - 物理引擎：自定义 Python 实现
    - 博弈求解：Nashpy 库
    - 前端：React + Three.js + AG-Grid
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
        "name": "物理模拟与博弈论求解平台",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
        "modules": {
            "physics_simulation": "/api/simulation",
            "game_theory_solver": "/api/game-solver",
            "trajectory": "/api/trajectory",
            "game_examples": "/api/game-examples",
        }
    }


app.include_router(health_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(trajectory_router, prefix="/api")
app.include_router(game_solver_router, prefix="/api")
app.include_router(game_examples_router, prefix="/api")
