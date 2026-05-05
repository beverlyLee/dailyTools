from fastapi import APIRouter
import logging
import os
from datetime import datetime

router = APIRouter(prefix="/api", tags=["健康检查"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 版本信息
VERSION = "1.0.0"
START_TIME = datetime.now()

# 可用的AI模型列表
AVAILABLE_MODELS = [
    "realesrgan_x4plus",
    "realesrgan_x2plus",
    "realesrgan_x8",
    "swinir_lightweight_x4",
    "swinir_classical_x4",
]


@router.get("/health")
async def health_check():
    """
    健康检查接口
    返回系统状态、版本信息和可用模型
    """
    try:
        uptime = (datetime.now() - START_TIME).total_seconds()
        
        # 检查数据库连接
        db_status = "ok"
        try:
            from database import engine
            with engine.connect() as conn:
                pass
        except Exception as e:
            logger.warning(f"数据库连接检查失败: {e}")
            db_status = "error"
        
        # 检查输出目录
        output_dir = "./outputs"
        output_status = "ok"
        if not os.path.exists(output_dir):
            try:
                os.makedirs(output_dir)
            except Exception:
                output_status = "error"
        
        health_status = {
            "status": "ok" if db_status == "ok" and output_status == "ok" else "degraded",
            "version": VERSION,
            "models_available": AVAILABLE_MODELS,
            "uptime_seconds": uptime,
            "start_time": START_TIME.isoformat(),
            "components": {
                "database": db_status,
                "output_directory": output_status
            }
        }
        
        logger.info(f"健康检查: status={health_status['status']}")
        
        return health_status
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "error",
            "version": VERSION,
            "models_available": AVAILABLE_MODELS,
            "error": str(e)
        }


@router.get("/status")
async def get_status():
    """
    获取系统详细状态
    """
    try:
        uptime = (datetime.now() - START_TIME).total_seconds()
        
        # 统计历史记录数量
        history_count = 0
        try:
            from database import SessionLocal
            from models import HistoryItem
            db = SessionLocal()
            history_count = db.query(HistoryItem).count()
            db.close()
        except Exception as e:
            logger.warning(f"获取历史记录数量失败: {e}")
        
        return {
            "success": True,
            "version": VERSION,
            "uptime": {
                "seconds": uptime,
                "formatted": format_uptime(uptime)
            },
            "start_time": START_TIME.isoformat(),
            "statistics": {
                "history_count": history_count,
            },
            "models": AVAILABLE_MODELS
        }
        
    except Exception as e:
        logger.error(f"获取状态失败: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def format_uptime(seconds: float) -> str:
    """
    格式化运行时间
    """
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}天")
    if hours > 0:
        parts.append(f"{hours}小时")
    if minutes > 0:
        parts.append(f"{minutes}分钟")
    if secs > 0 or not parts:
        parts.append(f"{secs}秒")
    
    return " ".join(parts)
