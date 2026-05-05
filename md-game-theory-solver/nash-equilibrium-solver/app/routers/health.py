from fastapi import APIRouter

router = APIRouter(tags=["健康检查"])


@router.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@router.get("/")
async def root():
    return {
        "name": "纳什均衡求解器 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
