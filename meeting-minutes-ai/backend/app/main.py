import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import meetings, settings
from .config import settings as app_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
logger.info("Database tables created/verified")

app = FastAPI(
    title="Meeting Minutes AI",
    description="AI 驱动的会议记录助手",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(settings.router)

logger.info(f"AI Service configured: model={app_settings.ARK_MODEL}")
logger.info(f"Database: {app_settings.DATABASE_URL}")


@app.get("/")
def root():
    return {
        "name": "Meeting Minutes AI API",
        "version": "1.0.0",
        "status": "running",
        "debug": app_settings.DEBUG,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    logger.info("Application startup complete")
    logger.info(f"Available routes: {len(app.routes)}")
