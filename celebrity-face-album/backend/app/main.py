from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

from app.database import init_db
from app.routers import resume, job, match

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="智能简历解析与评分系统 API",
    description="一个基于NLP的智能简历解析与岗位匹配系统",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/v1/resume", tags=["简历管理"])
app.include_router(job.router, prefix="/api/v1/job", tags=["岗位管理"])
app.include_router(match.router, prefix="/api/v1/match", tags=["匹配分析"])


@app.on_event("startup")
def startup_event():
    logger.info("正在初始化数据库...")
    init_db()
    logger.info("数据库初始化完成")
    logger.info("智能简历解析与评分系统 API 已启动")


@app.get("/")
def root():
    return {
        "message": "欢迎使用智能简历解析与评分系统",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/health")
def api_health_check():
    return {"status": "healthy"}
