from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import housing
from app.database import init_db
from datetime import datetime

app = FastAPI(
    title="房价走势线性回归预测系统",
    description="基于多元线性回归的房价预测系统，支持数据上传、模型训练、实时预测和可视化分析",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(housing.router, prefix="/api/v1/housing", tags=["房价预测"])


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/")
async def root():
    return {
        "message": "房价走势线性回归预测系统 API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "训练模型": "POST /api/v1/housing/train",
            "预测房价": "POST /api/v1/housing/predict",
            "上传数据": "POST /api/v1/housing/upload-data",
            "获取模型信息": "GET /api/v1/housing/model-info/{model_id}",
            "获取最新模型": "GET /api/v1/housing/latest-model",
            "获取特征范围": "GET /api/v1/housing/feature-ranges",
            "获取可用数据集": "GET /api/v1/housing/available-datasets"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
