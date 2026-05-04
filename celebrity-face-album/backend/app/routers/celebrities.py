from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
from pathlib import Path
from pydantic import BaseModel

from app.database import get_db
from app.models import Celebrity, PhotoCelebrity, Photo
from app.face_service import face_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/celebrities", tags=["celebrities"])

AVATAR_DIR = Path(__file__).parent.parent.parent / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


class CelebrityCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CelebrityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.post("")
async def create_celebrity(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    existing_celebrity = db.query(Celebrity).filter(Celebrity.name == name).first()
    if existing_celebrity:
        raise HTTPException(status_code=400, detail=f"名人 '{name}' 已存在")
    
    if not face_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    try:
        contents = await face_image.read()
        
        face_results = face_service.process_image_from_bytes(contents)
        
        if not face_results:
            raise HTTPException(status_code=400, detail="图片中未检测到人脸")
        
        if len(face_results) > 1:
            raise HTTPException(status_code=400, detail="图片中检测到多张人脸，请上传单人脸图片")
        
        face_encoding = face_results[0]['encoding']
        
        file_ext = os.path.splitext(face_image.filename)[1]
        avatar_filename = f"{uuid.uuid4()}{file_ext}"
        avatar_path = AVATAR_DIR / avatar_filename
        
        with open(avatar_path, "wb") as f:
            f.write(contents)
        
        celebrity = Celebrity(
            name=name,
            description=description,
            avatar_url=f"/api/celebrities/{uuid.uuid4()}/avatar",
            face_encoding=face_encoding
        )
        db.add(celebrity)
        db.commit()
        db.refresh(celebrity)
        
        celebrity.avatar_url = f"/api/celebrities/{celebrity.id}/avatar"
        db.commit()
        db.refresh(celebrity)
        
        return {
            "id": celebrity.id,
            "name": celebrity.name,
            "description": celebrity.description,
            "avatar_url": celebrity.avatar_url,
            "created_at": celebrity.created_at,
            "photo_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建名人失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建失败: {str(e)}")


@router.get("")
def get_celebrities(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    
    total = db.query(Celebrity).count()
    
    celebrities = db.query(Celebrity).order_by(Celebrity.created_at.desc()).offset(offset).limit(limit).all()
    
    celebrity_list = []
    for celebrity in celebrities:
        photo_count = db.query(PhotoCelebrity).filter(
            PhotoCelebrity.celebrity_id == celebrity.id
        ).count()
        
        celebrity_list.append({
            "id": celebrity.id,
            "name": celebrity.name,
            "description": celebrity.description,
            "avatar_url": celebrity.avatar_url,
            "created_at": celebrity.created_at,
            "photo_count": photo_count
        })
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "celebrities": celebrity_list
    }


@router.get("/{celebrity_id}")
def get_celebrity(
    celebrity_id: int,
    db: Session = Depends(get_db)
):
    celebrity = db.query(Celebrity).filter(Celebrity.id == celebrity_id).first()
    
    if not celebrity:
        raise HTTPException(status_code=404, detail="名人不存在")
    
    photo_count = db.query(PhotoCelebrity).filter(
        PhotoCelebrity.celebrity_id == celebrity_id
    ).count()
    
    return {
        "id": celebrity.id,
        "name": celebrity.name,
        "description": celebrity.description,
        "avatar_url": celebrity.avatar_url,
        "created_at": celebrity.created_at,
        "updated_at": celebrity.updated_at,
        "photo_count": photo_count
    }


@router.get("/{celebrity_id}/avatar")
def get_celebrity_avatar(
    celebrity_id: int,
    db: Session = Depends(get_db)
):
    celebrity = db.query(Celebrity).filter(Celebrity.id == celebrity_id).first()
    
    if not celebrity:
        raise HTTPException(status_code=404, detail="名人不存在")
    
    if not celebrity.avatar_url:
        raise HTTPException(status_code=404, detail="头像不存在")
    
    avatar_files = list(AVATAR_DIR.glob("*"))
    for avatar_file in avatar_files:
        if str(avatar_file).endswith(f"{celebrity_id}") or avatar_file.stat().st_ctime > 0:
            if avatar_file.exists():
                return FileResponse(
                    path=str(avatar_file),
                    media_type="image/jpeg"
                )
    
    raise HTTPException(status_code=404, detail="头像文件不存在")


@router.put("/{celebrity_id}")
async def update_celebrity(
    celebrity_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    face_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    celebrity = db.query(Celebrity).filter(Celebrity.id == celebrity_id).first()
    
    if not celebrity:
        raise HTTPException(status_code=404, detail="名人不存在")
    
    try:
        if name and name != celebrity.name:
            existing_celebrity = db.query(Celebrity).filter(Celebrity.name == name).first()
            if existing_celebrity:
                raise HTTPException(status_code=400, detail=f"名人 '{name}' 已存在")
            celebrity.name = name
        
        if description is not None:
            celebrity.description = description
        
        if face_image:
            if not face_image.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="请上传图片文件")
            
            contents = await face_image.read()
            
            face_results = face_service.process_image_from_bytes(contents)
            
            if not face_results:
                raise HTTPException(status_code=400, detail="图片中未检测到人脸")
            
            if len(face_results) > 1:
                raise HTTPException(status_code=400, detail="图片中检测到多张人脸，请上传单人脸图片")
            
            celebrity.face_encoding = face_results[0]['encoding']
            
            file_ext = os.path.splitext(face_image.filename)[1]
            avatar_filename = f"{uuid.uuid4()}{file_ext}"
            avatar_path = AVATAR_DIR / avatar_filename
            
            with open(avatar_path, "wb") as f:
                f.write(contents)
            
            celebrity.avatar_url = f"/api/celebrities/{celebrity_id}/avatar"
        
        db.commit()
        db.refresh(celebrity)
        
        photo_count = db.query(PhotoCelebrity).filter(
            PhotoCelebrity.celebrity_id == celebrity_id
        ).count()
        
        return {
            "id": celebrity.id,
            "name": celebrity.name,
            "description": celebrity.description,
            "avatar_url": celebrity.avatar_url,
            "created_at": celebrity.created_at,
            "updated_at": celebrity.updated_at,
            "photo_count": photo_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新名人信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@router.delete("/{celebrity_id}")
def delete_celebrity(
    celebrity_id: int,
    db: Session = Depends(get_db)
):
    celebrity = db.query(Celebrity).filter(Celebrity.id == celebrity_id).first()
    
    if not celebrity:
        raise HTTPException(status_code=404, detail="名人不存在")
    
    try:
        db.query(PhotoCelebrity).filter(PhotoCelebrity.celebrity_id == celebrity_id).delete()
        
        from app.models import FaceDetection
        db.query(FaceDetection).filter(FaceDetection.celebrity_id == celebrity_id).update(
            {FaceDetection.celebrity_id: None, FaceDetection.celebrity_name: None}
        )
        
        db.delete(celebrity)
        db.commit()
        
        return {"message": "名人删除成功", "celebrity_id": celebrity_id}
    except Exception as e:
        db.rollback()
        logger.error(f"删除名人失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
