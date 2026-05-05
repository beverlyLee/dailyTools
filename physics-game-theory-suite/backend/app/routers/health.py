from fastapi import APIRouter
from app.schemas import HealthResponse
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        components={
            "physics_engine": True,
            "game_solver": True,
            "database": True,
        }
    )


@router.get("/ping")
def ping():
    return {"ping": "pong"}
