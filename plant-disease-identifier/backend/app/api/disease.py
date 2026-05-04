from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from PIL import Image
import io
from typing import Optional

from app.core.database import get_db
from app.core.model_loader import model_loader
from app.core.config import settings
from app.schemas.disease import DiseaseResponse, DiseaseInfo, TreatmentInfo
from app.models.plant import Plant, HealthRecord
from app.core.knowledge_base import knowledge_base

router = APIRouter()


@router.post("/identify", response_model=DiseaseResponse)
async def identify_disease(
    image: UploadFile = File(..., description="植物病害图片"),
    plant_id: Optional[int] = None,
    save_record: bool = True,
    db: Session = Depends(get_db)
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="上传的文件不是图片格式")
    
    try:
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data))
        
        predictions = model_loader.predict_with_class_names(pil_image, top_k=3)
        
        if not predictions:
            raise HTTPException(status_code=500, detail="图片识别失败")
        
        primary_prediction = predictions[0]
        primary_disease = DiseaseInfo(
            disease_name=primary_prediction[0],
            confidence=primary_prediction[1],
            confidence_percent=primary_prediction[2]
        )
        
        other_candidates = []
        for pred in predictions[1:]:
            other_candidates.append(DiseaseInfo(
                disease_name=pred[0],
                confidence=pred[1],
                confidence_percent=pred[2]
            ))
        
        treatment_info = knowledge_base.get_treatment(primary_disease.disease_name)
        
        if plant_id is not None and save_record:
            plant = db.query(Plant).filter(Plant.id == plant_id).first()
            if plant:
                health_status = "健康" if primary_disease.disease_name == "健康" else "患病"
                health_record = HealthRecord(
                    plant_id=plant_id,
                    health_status=health_status,
                    identified_disease=primary_disease.disease_name,
                    confidence=primary_disease.confidence_percent,
                    treatment_suggestion=treatment_info.model_dump_json() if treatment_info else None
                )
                db.add(health_record)
                
                plant.current_health_status = health_status
                db.commit()
        
        return DiseaseResponse(
            success=True,
            primary_disease=primary_disease,
            other_candidates=other_candidates,
            treatment_info=treatment_info
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别过程中发生错误: {str(e)}")


@router.get("/classes")
async def get_disease_classes():
    return {
        "total": len(settings.DISEASE_CLASSES),
        "classes": settings.DISEASE_CLASSES
    }


@router.get("/treatment/{disease_name}")
async def get_treatment_info(disease_name: str):
    treatment = knowledge_base.get_treatment(disease_name)
    if treatment is None:
        raise HTTPException(status_code=404, detail=f"未找到病害 '{disease_name}' 的防治信息")
    return treatment


@router.get("/treatments")
async def get_all_treatments():
    return knowledge_base.get_all_treatments()
