import io
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import ClassificationHistory
from app.services import ModelService, KnowledgeService
from app.config import ALLOWED_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/classification",
    tags=["classification"]
)

model_service = ModelService()
knowledge_service = KnowledgeService()


def allowed_file(filename: str) -> bool:
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/classify")
async def classify_image(
    file: UploadFile = File(...),
    save_history: bool = True,
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        item_name, category, confidence = model_service.classify(image)
        
        disposal_guide = knowledge_service.get_disposal_guide(item_name, category)
        
        history_record = None
        if save_history:
            try:
                history_record = ClassificationHistory(
                    predicted_item=item_name,
                    waste_category=category,
                    confidence=confidence,
                    disposal_guide=disposal_guide.get("disposal_instructions", "")
                )
                db.add(history_record)
                db.commit()
                db.refresh(history_record)
            except Exception as e:
                logger.error(f"Failed to save history: {e}")
                db.rollback()
        
        response = {
            "success": True,
            "result": {
                "item_name": item_name,
                "category": category,
                "confidence": round(confidence * 100, 2),
                "disposal_guide": disposal_guide
            },
            "history_id": history_record.id if history_record else None
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@router.get("/categories")
async def get_categories():
    categories = knowledge_service.get_all_categories()
    return JSONResponse(content={
        "success": True,
        "categories": categories
    })
