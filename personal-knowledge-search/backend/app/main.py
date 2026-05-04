from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .routers import documents_router, graph_router, cards_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Data directory: {settings.DATA_DIR}")
    yield
    print(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Personal Knowledge Search - Second Brain Application",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/v1")
app.include_router(graph_router, prefix="/api/v1")
app.include_router(cards_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api": {
            "documents": "/api/v1/documents",
            "graph": "/api/v1/graph",
            "cards": "/api/v1/cards",
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


@app.get("/api/v1/stats")
async def get_stats():
    from .services import index_service, vector_store, sm2_service
    
    return {
        "documents": {
            "count": index_service.get_document_count(),
        },
        "vectors": {
            "count": vector_store.get_total_vectors(),
            "dimension": vector_store.dimension,
        },
        "cards": sm2_service.get_card_count_by_status(),
    }
