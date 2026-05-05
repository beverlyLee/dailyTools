"""
分子动力学与博弈论求解器后端主入口
"""

import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.db.database import init_db
from app.api.md_routes import router as md_router
from app.api.game_routes import router as game_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    init_db()
    print("数据库初始化完成")
    yield
    # 关闭时的清理操作
    print("应用关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="分子动力学与博弈论求解器 API",
    description="一个整合分子动力学模拟和博弈论纳什均衡求解的系统",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置（允许前端跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # 前端开发服务器
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(md_router, prefix="/api")
app.include_router(game_router, prefix="/api")


# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证错误处理"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "detail": "请求参数验证失败",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "detail": str(exc),
        },
    )


# 健康检查接口
@app.get("/")
@app.get("/health")
async def health_check():
    """健康检查"""
    return JSONResponse(
        content={
            "success": True,
            "message": "MD & Game Theory Solver API is running",
            "version": "1.0.0",
            "endpoints": {
                "molecular_dynamics": "/api/md/*",
                "game_theory": "/api/game/*",
                "docs": "/docs",
            },
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
