from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import ui_test, api_test, scheduler, reports
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="自动化测试指挥台 API",
    description="Web UI 自动化设计器和 API 自动化测试矩阵的后端服务",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ui_test.router, prefix="/api/ui-test", tags=["UI 自动化测试"])
app.include_router(api_test.router, prefix="/api/api-test", tags=["API 自动化测试"])
app.include_router(scheduler.router, prefix="/api/scheduler", tags=["任务调度"])
app.include_router(reports.router, prefix="/api/reports", tags=["测试报告"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "自动化测试指挥台服务运行中"}


@app.get("/api/stats")
async def get_statistics():
    return {
        "total_test_cases": 128,
        "ui_test_cases": 45,
        "api_test_cases": 83,
        "today_success_rate": 94.5
    }
