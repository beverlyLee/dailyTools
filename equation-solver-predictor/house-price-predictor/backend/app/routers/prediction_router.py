from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import traceback

from ..database import get_db
from ..models import PredictionHistory
from ..schemas import (
    PredictionRequest,
    PredictionResponse,
    FeaturesInfoResponse,
    FeatureInfo,
)
from ..services.predictor import HousePricePredictor
from ..config import settings

router = APIRouter(prefix="/api/prediction", tags=["房价预测"])

predictor: HousePricePredictor | None = None


def get_predictor() -> HousePricePredictor:
    global predictor
    if predictor is None:
        predictor = HousePricePredictor(
            data_path=settings.DATA_FILE_PATH,
            model_path=settings.MODEL_FILE_PATH,
            scaler_path=settings.SCALER_FILE_PATH
        )
        predictor.initialize()
    return predictor


@router.get(
    "/features",
    response_model=FeaturesInfoResponse,
    summary="获取特征信息",
    description="获取所有预测特征的详细信息，包括名称、描述、范围等"
)
async def get_features_info():
    try:
        predictor = get_predictor()
        features = predictor.get_feature_info()
        
        feature_list = [
            FeatureInfo(
                name=f["name"],
                display_name=f["display_name"],
                description=f["description"],
                min_value=f["min_value"],
                max_value=f["max_value"],
                default_value=f["default_value"]
            )
            for f in features
        ]
        
        return FeaturesInfoResponse(data=feature_list)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取特征信息失败: {str(e)}"
        )


@router.get(
    "/default-values",
    summary="获取默认特征值",
    description="获取所有特征的默认值，用于初始化预测界面"
)
async def get_default_values():
    try:
        predictor = get_predictor()
        defaults = predictor.get_default_features()
        
        return {
            "success": True,
            "data": defaults
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取默认值失败: {str(e)}"
        )


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="预测房价",
    description="根据输入的特征值预测房价"
)
async def predict_price(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    try:
        predictor = get_predictor()
        
        features = request.features
        
        feature_info = predictor.get_feature_info()
        for info in feature_info:
            if info["name"] not in features:
                features[info["name"]] = info["default_value"]
        
        result = predictor.predict(features)
        
        try:
            prediction_record = PredictionHistory(
                input_features=features,
                predicted_price=result["predicted_price"]
            )
            db.add(prediction_record)
            db.commit()
        except Exception as db_error:
            print(f"保存预测记录失败: {db_error}")
        
        return PredictionResponse(
            message="预测成功",
            data=result
        )
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"预测失败: {str(e)}"
        )


@router.get(
    "/history",
    summary="获取预测历史",
    description="获取最近的房价预测历史记录"
)
async def get_prediction_history(
    db: Session = Depends(get_db),
    limit: int = 50
):
    try:
        records = db.query(PredictionHistory).order_by(
            PredictionHistory.created_at.desc()
        ).limit(limit).all()
        
        return {
            "success": True,
            "data": [record.to_dict() for record in records]
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取预测历史失败: {str(e)}"
        )
