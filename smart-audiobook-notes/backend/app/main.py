from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import audiobooks

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Audiobook Notes API",
    description="智能有声书笔记生成系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audiobooks.router)

@app.get("/")
def root():
    return {"message": "Smart Audiobook Notes API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
