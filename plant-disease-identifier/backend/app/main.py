from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api import disease, plant, health

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据库
@app.on_event("startup")
async def startup_event():
    init_db()

# 注册路由
app.include_router(
    disease.router,
    prefix=f"{settings.API_V1_STR}/disease",
    tags=["病害识别"]
)

app.include_router(
    plant.router,
    prefix=f"{settings.API_V1_STR}/plant",
    tags=["植物档案"]
)

app.include_router(
    health.router,
    prefix=f"{settings.API_V1_STR}/health",
    tags=["健康检查"]
)


@app.get("/")
def root():
    return {
        "message": "欢迎使用植物病害识别系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }
