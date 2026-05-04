from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api import translation, asr, tts, phrases

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    print("Database initialized")
    yield
    print(f"Shutting down {settings.APP_NAME}")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="跨境商务实时翻译应用 - 支持多语种语音翻译",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translation.router, prefix=settings.API_PREFIX)
app.include_router(asr.router, prefix=settings.API_PREFIX)
app.include_router(tts.router, prefix=settings.API_PREFIX)
app.include_router(phrases.router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "api_prefix": settings.API_PREFIX
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }
