from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from ..config import settings
from ..ml import classify_text, classify_texts, get_classifier
from ..schemas.bill import ClassificationResult

router = APIRouter(prefix="/api/categories", tags=["categories"])


class TextInput(BaseModel):
    text: str


class TextsInput(BaseModel):
    texts: List[str]


@router.get("")
def get_all_categories():
    return settings.CATEGORIES


@router.post("/classify", response_model=ClassificationResult)
def classify_single_text(input_data: TextInput):
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")
    
    category, confidence = classify_text(input_data.text)
    
    return ClassificationResult(
        category=category,
        confidence=confidence,
    )


@router.post("/classify/batch", response_model=List[ClassificationResult])
def classify_multiple_texts(input_data: TextsInput):
    if not input_data.texts:
        raise HTTPException(status_code=400, detail="文本列表不能为空")
    
    results = classify_texts(input_data.texts)
    
    return [
        ClassificationResult(category=cat, confidence=conf)
        for cat, conf in results
    ]


@router.post("/retrain")
def retrain_model():
    try:
        classifier = get_classifier()
        classifier.train()
        classifier.save()
        
        return {
            "success": True,
            "message": "模型重新训练成功",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"模型训练失败: {str(e)}"
        )


@router.get("/model/info")
def get_model_info():
    classifier = get_classifier()
    
    return {
        "categories": classifier.CATEGORIES,
        "training_data_count": len(classifier.TRAINING_DATA),
        "is_trained": classifier._is_trained,
        "model_path": str(classifier.model_path),
    }
