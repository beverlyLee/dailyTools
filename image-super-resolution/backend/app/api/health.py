from fastapi import APIRouter
from ..config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


@router.get("/ready")
async def readiness_check():
    return {
        "status": "ready",
        "database": "connected",
        "model": "loaded"
    }
