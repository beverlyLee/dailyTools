import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db
from routers import restoration, history, settings, health

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    # 启动时执行
    logger.info("正在初始化老照片超分辨率修复系统...")
    
    # 初始化数据库
    try:
        init_db()
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
    
    # 确保输出目录存在
    output_dir = "./outputs"
    os.makedirs(output_dir, exist_ok=True)
    logger.info(f"输出目录已准备: {output_dir}")
    
    logger.info("老照片超分辨率修复系统启动完成！")
    
    yield
    
    # 关闭时执行
    logger.info("正在关闭老照片超分辨率修复系统...")


app = FastAPI(
    title="老照片超分辨率修复系统",
    description="基于AI的老照片修复系统，支持超分辨率重建、划痕修复和智能上色",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为特定的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(restoration.router)
app.include_router(history.router)
app.include_router(settings.router)
app.include_router(health.router)


@app.get("/")
async def root():
    """
    根路径
    """
    return {
        "message": "欢迎使用老照片超分辨率修复系统",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/info")
async def get_api_info():
    """
    获取API信息
    """
    return {
        "name": "老照片超分辨率修复系统 API",
        "version": "1.0.0",
        "endpoints": {
            "照片修复": [
                "POST /api/restore - 完整修复（超分辨率+划痕修复+上色）",
                "POST /api/super-resolution - 仅超分辨率重建",
                "POST /api/inpainting - 仅划痕修复",
                "POST /api/colorization - 仅智能上色",
                "GET /api/outputs/{filename} - 获取输出图片"
            ],
            "历史记录": [
                "GET /api/history/list - 获取历史记录列表",
                "GET /api/history/{item_id} - 获取单条历史记录",
                "POST /api/history/save - 保存历史记录",
                "DELETE /api/history/{item_id} - 删除历史记录",
                "DELETE /api/history/ - 清空所有历史记录"
            ],
            "系统设置": [
                "GET /api/settings/ - 获取所有设置",
                "GET /api/settings/{key} - 获取单个设置",
                "POST /api/settings/save - 保存设置",
                "POST /api/settings/reset - 重置设置",
                "DELETE /api/settings/{key} - 删除设置"
            ],
            "健康检查": [
                "GET /api/health - 健康检查",
                "GET /api/status - 获取系统状态"
            ]
        },
        "supported_models": [
            "realesrgan_x4plus - Real-ESRGAN x4 (推荐)",
            "realesrgan_x2plus - Real-ESRGAN x2",
            "realesrgan_x8 - Real-ESRGAN x8",
            "swinir_lightweight_x4 - SwinIR Lightweight x4",
            "swinir_classical_x4 - SwinIR Classical x4"
        ],
        "supported_scales": [2, 4, 8],
        "features": [
            "超分辨率重建 (Real-ESRGAN / SwinIR)",
            "划痕修复 (Inpainting)",
            "智能上色 (Colorization)",
            "处理前后对比滑块",
            "PNG高清下载",
            "修复历史记录管理"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
