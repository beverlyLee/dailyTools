import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import classification_router, history_router, knowledge_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Waste Sorting API...")
    
    init_db()
    logger.info("Database initialized.")
    
    logger.info("API ready to accept requests.")
    yield
    
    logger.info("Shutting down Smart Waste Sorting API...")


app = FastAPI(
    title="Smart Waste Sorting API",
    description="AI-powered waste classification and recycling guide API",
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

app.include_router(classification_router)
app.include_router(history_router)
app.include_router(knowledge_router)


@app.get("/")
async def root():
    return {
        "message": "Smart Waste Sorting API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "smart-waste-sorting-api"
    }
