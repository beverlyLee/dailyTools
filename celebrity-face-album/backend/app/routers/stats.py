from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Photo, Celebrity, FaceDetection
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats")
def get_statistics(db: Session = Depends(get_db)):
    photo_count = db.query(Photo).count()
    celebrity_count = db.query(Celebrity).count()
    face_detection_count = db.query(FaceDetection).count()
    
    recognized_face_count = db.query(FaceDetection).filter(
        FaceDetection.celebrity_id.isnot(None)
    ).count()
    
    recent_photos = db.query(Photo).order_by(
        Photo.uploaded_at.desc()
    ).limit(5).all()
    
    recent_photos_data = []
    for photo in recent_photos:
        face_detections = db.query(FaceDetection).filter(
            FaceDetection.photo_id == photo.id
        ).all()
        
        faces_data = []
        for face in face_detections:
            faces_data.append({
                "id": face.id,
                "celebrity_id": face.celebrity_id,
                "celebrity_name": face.celebrity_name,
                "similarity": face.similarity
            })
        
        recent_photos_data.append({
            "id": photo.id,
            "filename": photo.filename,
            "uploaded_at": photo.uploaded_at,
            "faces": faces_data
        })
    
    return {
        "photos": photo_count,
        "celebrities": celebrity_count,
        "detections": face_detection_count,
        "recognized": recognized_face_count,
        "recent_photos": recent_photos_data
    }
