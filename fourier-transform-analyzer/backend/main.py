from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.routers import signal, snapshots

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Fourier Transform Analyzer API",
    description="傅里叶变换信号分析应用后端 API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signal.router, prefix="/api/signal", tags=["信号处理"])
app.include_router(snapshots.router, prefix="/api/snapshots", tags=["快照管理"])

@app.get("/")
def root():
    return {
        "message": "Fourier Transform Analyzer API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
