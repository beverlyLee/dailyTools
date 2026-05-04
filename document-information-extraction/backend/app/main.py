from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import invoice

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="增值税发票智能核验系统",
    description="基于PaddleOCR的发票、火车票、机票智能识别与核验系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoice.router)

@app.get("/")
async def root():
    return {
        "message": "增值税发票智能核验系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
