from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import logging

from database import get_db
import schemas
from models import Settings

router = APIRouter(prefix="/api/settings", tags=["系统设置"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 默认设置
DEFAULT_SETTINGS = {
    "modelType": "realesrgan_x4plus",
    "apiUrl": "http://localhost:8001",
    "timeout": 180,
    "defaultScale": 4,
    "enableInpainting": True,
    "enableColorization": False,
    "outputQuality": "high",
    "canvasWidth": 800,
    "canvasHeight": 500,
}


@router.get("/")
def get_all_settings(db: Session = Depends(get_db)):
    """
    获取所有设置
    """
    try:
        settings = db.query(Settings).all()
        
        result = {}
        for setting in settings:
            # 尝试解析JSON值
            try:
                result[setting.key] = json.loads(setting.value)
            except (json.JSONDecodeError, TypeError):
                result[setting.key] = setting.value
        
        # 合并默认设置
        for key, default_value in DEFAULT_SETTINGS.items():
            if key not in result:
                result[key] = default_value
        
        logger.info("获取所有设置")
        
        return {
            "success": True,
            "settings": result
        }
        
    except Exception as e:
        logger.error(f"获取设置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取设置失败: {str(e)}")


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    """
    获取单个设置
    """
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        
        if setting:
            try:
                value = json.loads(setting.value)
            except (json.JSONDecodeError, TypeError):
                value = setting.value
        else:
            value = DEFAULT_SETTINGS.get(key)
        
        logger.info(f"获取设置: key={key}")
        
        return {
            "success": True,
            "key": key,
            "value": value
        }
        
    except Exception as e:
        logger.error(f"获取设置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取设置失败: {str(e)}")


@router.post("/save")
def save_settings(
    settings_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    保存设置
    - 支持批量保存多个设置
    """
    try:
        saved_count = 0
        
        for key, value in settings_data.items():
            # 将值序列化为JSON字符串
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value)
            elif isinstance(value, bool):
                value_str = json.dumps(value)
            else:
                value_str = str(value)
            
            # 检查是否已存在
            existing = db.query(Settings).filter(Settings.key == key).first()
            
            if existing:
                existing.value = value_str
            else:
                new_setting = Settings(key=key, value=value_str)
                db.add(new_setting)
            
            saved_count += 1
        
        db.commit()
        
        logger.info(f"保存设置: 共保存 {saved_count} 项")
        
        return {
            "success": True,
            "message": f"设置已保存，共 {saved_count} 项",
            "saved_count": saved_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"保存设置失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存设置失败: {str(e)}")


@router.post("/reset")
def reset_settings(db: Session = Depends(get_db)):
    """
    重置所有设置为默认值
    """
    try:
        # 删除所有自定义设置
        db.query(Settings).delete()
        db.commit()
        
        logger.info("重置所有设置为默认值")
        
        return {
            "success": True,
            "message": "已重置所有设置为默认值",
            "default_settings": DEFAULT_SETTINGS
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"重置设置失败: {e}")
        raise HTTPException(status_code=500, detail=f"重置设置失败: {str(e)}")


@router.delete("/{key}")
def delete_setting(key: str, db: Session = Depends(get_db)):
    """
    删除单个设置（恢复为默认值）
    """
    try:
        setting = db.query(Settings).filter(Settings.key == key).first()
        
        if setting:
            db.delete(setting)
            db.commit()
            message = f"已删除设置: {key}，将使用默认值"
        else:
            message = f"设置不存在: {key}"
        
        logger.info(f"删除设置: key={key}")
        
        return {
            "success": True,
            "message": message
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"删除设置失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除设置失败: {str(e)}")
