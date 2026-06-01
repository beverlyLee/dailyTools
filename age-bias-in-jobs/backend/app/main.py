from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.core.config import settings


app = FastAPI(
    title="招聘市场年龄歧视分析系统API",
    description="基于FastAPI的招聘市场年龄歧视分析后端服务",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": "招聘市场年龄歧视分析系统API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
