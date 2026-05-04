from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.model_loader import model_loader
from app.core.config import settings
from app.schemas.disease import HealthCheckResponse

router = APIRouter()


@router.get("/", response_model=HealthCheckResponse)
async def health_check(db: Session = Depends(get_db)):
    model_loaded = model_loader.is_loaded
    
    try:
        db.execute(text("SELECT 1"))
        database_connected = True
    except Exception:
        database_connected = False
    
    if model_loaded:
        status = "healthy"
    elif database_connected:
        status = "partial"
    else:
        status = "unhealthy"
    
    return HealthCheckResponse(
        status=status,
        model_loaded=model_loaded,
        model_path=settings.MODEL_PATH,
        database_connected=database_connected
    )


@router.get("/ping")
async def ping():
    return {"message": "pong"}


@router.post("/model/load")
async def load_model():
    success = model_loader.load_model()
    return {
        "success": success,
        "message": "模型加载成功" if success else "模型加载失败"
    }


@router.post("/model/unload")
async def unload_model():
    model_loader.unload_model()
    return {"message": "模型已卸载"}


@router.get("/model/status")
async def model_status():
    return {
        "loaded": model_loader.is_loaded,
        "device": str(model_loader.device) if model_loader.is_loaded else None
    }
