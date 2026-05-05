from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from config import settings
from database import init_db
from routers import translation, asr, tts

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("初始化数据库...")
    await init_db()
    logger.info("数据库初始化完成")
    
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
    yield
    
    logger.info("应用关闭中...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="跨境商务实时翻译机 - 支持流式ASR、多语种翻译、TTS语音合成",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"服务器内部错误: {str(exc)}"}
    )

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "debug": settings.DEBUG
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(translation.router, prefix="/api/v1")
app.include_router(asr.router, prefix="/api/v1")
app.include_router(tts.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
