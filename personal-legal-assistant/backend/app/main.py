from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import init_db
from .routers import cases_router, analysis_router, documents_router, rag_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Data directory: {settings.DATA_DIR}")
    init_db()
    print("Database initialized")
    yield
    print(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Personal Legal Assistant - 普惠法律服务全栈应用",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api": {
            "cases": "/api/v1/cases",
            "analysis": "/api/v1/analysis",
            "documents": "/api/v1/documents",
            "rag": "/api/v1/rag",
        },
        "docs": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
