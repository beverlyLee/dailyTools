from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/health", tags=["健康检查"])


@router.get("")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "molecular-dynamics-simulator",
    }


@router.get("/ping")
async def ping():
    return {"message": "pong"}
