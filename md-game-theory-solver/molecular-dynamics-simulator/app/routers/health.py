from fastapi import APIRouter

router = APIRouter(tags=["健康检查"])


@router.get("/health")
async def health_check():
    return {"status": "healthy"}


@router.get("/")
async def root():
    return {
        "name": "分子动力学模拟器 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
