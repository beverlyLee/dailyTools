from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import story_editor, report_generator

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(story_editor.router, prefix=f"{settings.API_V1_STR}/stories", tags=["数据故事编辑器"])
app.include_router(report_generator.router, prefix=f"{settings.API_V1_STR}/reports", tags=["参数化报告生成器"])

@app.get("/")
def read_root():
    return {"message": "欢迎使用数据叙事平台 API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
