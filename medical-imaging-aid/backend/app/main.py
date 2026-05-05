from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import viewer, reports, ai

app = FastAPI(
    title="医疗影像辅助诊断系统 API",
    description="后端服务，提供 DICOM 处理、AI 诊断和报告管理功能",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(viewer.router, prefix="/api/viewer", tags=["阅片工作站"])
app.include_router(reports.router, prefix="/api/reports", tags=["报告管理"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI 诊断"])

@app.get("/")
def read_root():
    return {"message": "医疗影像辅助诊断系统后端服务运行中", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
