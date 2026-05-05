from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import experiments, models, monitoring
from app.services import monitoring_service

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    monitoring_service.start_monitoring()
    yield
    monitoring_service.stop_monitoring()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(experiments.router, prefix="/api/experiments", tags=["experiments"])
app.include_router(models.router, prefix="/api/models", tags=["models"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
