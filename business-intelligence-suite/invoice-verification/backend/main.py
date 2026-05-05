from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from config import settings
from database import init_db
from routers import invoice, company, reimbursement

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("初始化数据库...")
    try:
        await init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.warning(f"数据库初始化失败（可能需要先创建数据库）: {e}")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"上传目录已创建: {settings.UPLOAD_DIR}")
    
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
    yield
    
    logger.info("应用关闭中...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="增值税发票智能核验系统 - 支持OCR识别、版面分析、规则引擎校验、Excel导出",
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
        "debug": settings.DEBUG,
        "supported_invoice_types": settings.SUPPORTED_INVOICE_TYPES
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(invoice.router, prefix="/api/v1")
app.include_router(company.router, prefix="/api/v1")
app.include_router(reimbursement.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )
