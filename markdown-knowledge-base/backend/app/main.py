from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import init_db
from .routers import files_router, links_router, search_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时初始化数据库
    await init_db()
    yield
    # 应用关闭时的清理操作
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Markdown Knowledge Base API",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源，生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(files_router, prefix="/api")
app.include_router(links_router, prefix="/api")
app.include_router(search_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/info")
async def get_app_info():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "notes_directory": str(settings.NOTES_DIR),
        "database": settings.DATABASE_URL,
        "index_directory": str(settings.INDEX_DIR)
    }
