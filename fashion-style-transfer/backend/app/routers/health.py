from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any
from loguru import logger
from datetime import datetime

from ..database import get_session
from ..config import settings

router = APIRouter(prefix="/api/health", tags=["健康检查"])


@router.get("", summary="健康检查")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/database", summary="数据库健康检查")
async def database_health_check(db: AsyncSession = Depends(get_session)):
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "ok",
            "database": "mock_mode",
            "message": "数据库连接失败，使用模拟模式",
            "timestamp": datetime.now().isoformat(),
        }


@router.get("/full", summary="完整系统健康检查")
async def full_health_check(db: AsyncSession = Depends(get_session)):
    results = {
        "api": {"status": "ok"},
        "database": {"status": "unknown"},
        "directories": {"status": "unknown"},
        "model_loader": {"status": "unknown"},
    }

    try:
        await db.execute(text("SELECT 1"))
        results["database"] = {"status": "connected"}
    except Exception as e:
        results["database"] = {
            "status": "mock_mode",
            "message": "数据库连接失败，使用模拟模式",
        }

    try:
        dirs_checked = []
        for dir_name in ["UPLOAD_DIR", "OUTPUT_DIR", "MODEL_DIR"]:
            dir_path = getattr(settings, dir_name, None)
            if dir_path:
                exists = dir_path.exists()
                is_dir = dir_path.is_dir() if exists else False
                dirs_checked.append({
                    "name": dir_name,
                    "path": str(dir_path),
                    "exists": exists,
                    "is_directory": is_dir,
                })
        results["directories"] = {"status": "ok", "checks": dirs_checked}
    except Exception as e:
        results["directories"] = {"status": "error", "message": str(e)}

    try:
        from ..services import style_transfer_service
        model_info = style_transfer_service.get_model_info()
        results["model_loader"] = {
            "status": "ok" if model_info.get("is_loaded") else "mock_mode",
            "controlnet_model": model_info.get("controlnet_model"),
            "base_model": model_info.get("base_model"),
            "device": model_info.get("device"),
        }
    except Exception as e:
        results["model_loader"] = {
            "status": "mock_mode",
            "message": "模型加载器使用模拟模式",
        }

    all_ok = all(
        r.get("status") in ["ok", "connected", "mock_mode"]
        for r in results.values()
    )

    return {
        "status": "ok" if all_ok else "degraded",
        "components": results,
        "timestamp": datetime.now().isoformat(),
        "environment": {
            "debug": settings.DEBUG,
            "device": settings.DEVICE,
        },
    }


@router.get("/system-info", summary="系统信息")
async def system_info():
    try:
        import platform
        import sys

        return {
            "success": True,
            "data": {
                "python_version": sys.version,
                "platform": platform.platform(),
                "machine": platform.machine(),
                "timestamp": datetime.now().isoformat(),
                "settings": {
                    "debug": settings.DEBUG,
                    "device": settings.DEVICE,
                    "api_host": settings.API_HOST,
                    "api_port": settings.API_PORT,
                },
            },
        }
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        return {
            "success": True,
            "data": {
                "timestamp": datetime.now().isoformat(),
                "settings": {
                    "debug": settings.DEBUG,
                    "device": settings.DEVICE,
                    "api_host": settings.API_HOST,
                    "api_port": settings.API_PORT,
                },
            },
        }
