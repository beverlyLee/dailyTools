from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
import os
import uuid
from datetime import datetime
from pathlib import Path

from app.database import get_db, get_async_db
from app.models import Photo, FaceDetection, Celebrity, PhotoCelebrity
from app.face_service import face_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photos", tags=["photos"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        photo = Photo(
            filename=file.filename,
            file_path=str(file_path),
            file_size=len(contents),
            content_type=file.content_type
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)
        
        celebrities = db.query(Celebrity).all()
        celebrity_database = [
            {
                'id': celeb.id,
                'name': celeb.name,
                'face_encoding': celeb.face_encoding
            }
            for celeb in celebrities
        ]
        
        try:
            face_results = face_service.process_image_from_bytes(contents, celebrity_database)
            
            for face_result in face_results:
                face_detection = FaceDetection(
                    photo_id=photo.id,
                    celebrity_id=face_result['celebrity_id'],
                    face_encoding=face_result['encoding'],
                    location_x=face_result['location']['x'],
                    location_y=face_result['location']['y'],
                    location_width=face_result['location']['width'],
                    location_height=face_result['location']['height'],
                    similarity=face_result['similarity'],
                    celebrity_name=face_result['celebrity_name']
                )
                db.add(face_detection)
                
                if face_result['celebrity_id']:
                    existing_relation = db.query(PhotoCelebrity).filter(
                        PhotoCelebrity.photo_id == photo.id,
                        PhotoCelebrity.celebrity_id == face_result['celebrity_id']
                    ).first()
                    
                    if not existing_relation:
                        photo_celebrity = PhotoCelebrity(
                            photo_id=photo.id,
                            celebrity_id=face_result['celebrity_id'],
                            similarity=face_result['similarity']
                        )
                        db.add(photo_celebrity)
            
            db.commit()
        except Exception as e:
            logger.error(f"人脸检测失败: {str(e)}")
        
        photo_data = {
            "id": photo.id,
            "filename": photo.filename,
            "file_size": photo.file_size,
            "content_type": photo.content_type,
            "uploaded_at": photo.uploaded_at,
            "faces": []
        }
        
        face_detections = db.query(FaceDetection).filter(FaceDetection.photo_id == photo.id).all()
        for face in face_detections:
            photo_data["faces"].append({
                "id": face.id,
                "celebrity_id": face.celebrity_id,
                "celebrity_name": face.celebrity_name,
                "similarity": face.similarity,
                "location": {
                    "x": face.location_x,
                    "y": face.location_y,
                    "width": face.location_width,
                    "height": face.location_height
                }
            })
        
        return photo_data
        
    except Exception as e:
        logger.error(f"上传照片失败: {str(e)}")
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@router.get("")
def get_photos(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    celebrity_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Photo)
    
    if celebrity_id:
        query = query.join(PhotoCelebrity).filter(PhotoCelebrity.celebrity_id == celebrity_id)
    
    total = query.count()
    
    photos = query.order_by(Photo.uploaded_at.desc()).offset(offset).limit(limit).all()
    
    photo_list = []
    for photo in photos:
        face_detections = db.query(FaceDetection).filter(FaceDetection.photo_id == photo.id).all()
        
        photo_data = {
            "id": photo.id,
            "filename": photo.filename,
            "file_size": photo.file_size,
            "content_type": photo.content_type,
            "uploaded_at": photo.uploaded_at,
            "faces": []
        }
        
        for face in face_detections:
            photo_data["faces"].append({
                "id": face.id,
                "celebrity_id": face.celebrity_id,
                "celebrity_name": face.celebrity_name,
                "similarity": face.similarity
            })
        
        photo_list.append(photo_data)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "photos": photo_list
    }


@router.get("/{photo_id}")
def get_photo(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    
    face_detections = db.query(FaceDetection).filter(FaceDetection.photo_id == photo_id).all()
    
    photo_data = {
        "id": photo.id,
        "filename": photo.filename,
        "file_size": photo.file_size,
        "content_type": photo.content_type,
        "uploaded_at": photo.uploaded_at,
        "faces": []
    }
    
    for face in face_detections:
        photo_data["faces"].append({
            "id": face.id,
            "celebrity_id": face.celebrity_id,
            "celebrity_name": face.celebrity_name,
            "similarity": face.similarity,
            "location": {
                "x": face.location_x,
                "y": face.location_y,
                "width": face.location_width,
                "height": face.location_height
            }
        })
    
    return photo_data


@router.get("/{photo_id}/image")
def get_photo_image(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    
    file_path = Path(photo.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="图片文件不存在")
    
    return FileResponse(
        path=str(file_path),
        media_type=photo.content_type or "image/jpeg"
    )


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db)
):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="照片不存在")
    
    file_path = Path(photo.file_path)
    
    try:
        db.delete(photo)
        db.commit()
        
        if file_path.exists():
            file_path.unlink()
        
        return {"message": "照片删除成功", "photo_id": photo_id}
    except Exception as e:
        db.rollback()
        logger.error(f"删除照片失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
