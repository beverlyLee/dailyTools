from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import traceback

from ..database import get_db
from ..models import ModelTrainingRecord
from ..schemas import (
    TrainModelRequest,
    TrainModelResponse,
    DatasetInfoResponse,
    ResidualDataResponse,
)
from ..services.predictor import HousePricePredictor
from ..config import settings

router = APIRouter(prefix="/api/model", tags=["模型管理"])

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
    "/info",
    summary="获取模型信息",
    description="获取当前模型的状态、指标和特征重要性"
)
async def get_model_info():
    try:
        predictor = get_predictor()
        
        metrics = predictor.get_model_metrics()
        feature_importance = predictor.get_feature_importance()
        is_trained = predictor.is_trained()
        
        return {
            "success": True,
            "data": {
                "is_trained": is_trained,
                "metrics": metrics,
                "feature_importance": feature_importance
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取模型信息失败: {str(e)}"
        )


@router.get(
    "/dataset-info",
    response_model=DatasetInfoResponse,
    summary="获取数据集信息",
    description="获取训练数据集的统计信息"
)
async def get_dataset_info():
    try:
        predictor = get_predictor()
        stats = predictor.get_dataset_stats()
        
        return DatasetInfoResponse(data=stats)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取数据集信息失败: {str(e)}"
        )


@router.post(
    "/train",
    response_model=TrainModelResponse,
    summary="训练模型",
    description="重新训练线性回归模型"
)
async def train_model(
    request: TrainModelRequest,
    db: Session = Depends(get_db)
):
    try:
        predictor = get_predictor()
        
        training_result = predictor.train_model(
            test_size=request.test_size,
            random_state=request.random_state
        )
        
        try:
            record = ModelTrainingRecord(
                model_name="linear_regression",
                dataset_size=training_result.get("dataset_size", 500),
                train_size=int(500 * (1 - request.test_size)),
                test_size=int(500 * request.test_size),
                r2_score=training_result["metrics"]["r2_score"],
                mse=training_result["metrics"]["mse"],
                rmse=training_result["metrics"]["rmse"],
                mae=training_result["metrics"]["mae"],
                coefficients=training_result["coefficients"],
                intercept=training_result["intercept"],
                feature_names=training_result["feature_names"],
                feature_importance=training_result["feature_importance"]
            )
            db.add(record)
            db.commit()
        except Exception as db_error:
            print(f"保存训练记录失败: {db_error}")
        
        return TrainModelResponse(
            message="模型训练成功",
            data=training_result
        )
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"模型训练失败: {str(e)}"
        )


@router.get(
    "/residuals",
    response_model=ResidualDataResponse,
    summary="获取残差数据",
    description="获取模型残差数据，用于残差分析可视化"
)
async def get_residual_data():
    try:
        predictor = get_predictor()
        residuals = predictor.get_residual_data()
        
        if residuals is None:
            raise HTTPException(
                status_code=404,
                detail="没有残差数据，请先训练模型"
            )
        
        return ResidualDataResponse(data=residuals)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取残差数据失败: {str(e)}"
        )


@router.get(
    "/training-records",
    summary="获取训练记录",
    description="获取历史模型训练记录"
)
async def get_training_records(
    db: Session = Depends(get_db),
    limit: int = 20
):
    try:
        records = db.query(ModelTrainingRecord).order_by(
            ModelTrainingRecord.created_at.desc()
        ).limit(limit).all()
        
        return {
            "success": True,
            "data": [record.to_dict() for record in records]
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"获取训练记录失败: {str(e)}"
        )
