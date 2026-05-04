from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .database import init_db
from .routers import visa_router, checklist_router, ocr_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Data directory: {settings.DATA_DIR}")
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")
    
    init_db()
    logger.info("Database initialized")
    
    yield
    
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Global Visa Tracker - Track visa applications across multiple countries",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(visa_router, prefix="/api/v1/visa", tags=["Visa Status"])
app.include_router(checklist_router, prefix="/api/v1/checklist", tags=["Document Checklist"])
app.include_router(ocr_router, prefix="/api/v1/ocr", tags=["OCR Processing"])


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api": {
            "visa": "/api/v1/visa",
            "checklist": "/api/v1/checklist",
            "ocr": "/api/v1/ocr",
        },
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
