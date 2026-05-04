import os
import tempfile
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import numpy as np

from app.database import get_db, init_db
from app.services.data_service import DataService
from app.services.model_service import ModelService

router = APIRouter()

data_service = DataService()
model_service = ModelService()

DATA_DIR = "./data"
os.makedirs(DATA_DIR, exist_ok=True)


class PredictionRequest(BaseModel):
    features: Dict[str, float]
    model_id: Optional[int] = None


class TrainRequest(BaseModel):
    file_path: str = "./data/housing_data.csv"
    target_column: str = "price"
    normalization_method: str = "standard"
    test_size: float = 0.2


class ModelInfoRequest(BaseModel):
    model_id: int


init_db()


@router.post("/upload-data")
async def upload_data(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(DATA_DIR, file.filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        df = data_service.load_csv(file_path)
        
        preview_data = df.head(10).to_dict(orient="records")
        
        return {
            "success": True,
            "message": f"文件 {file.filename} 上传成功",
            "file_path": file_path,
            "columns": list(df.columns),
            "total_rows": len(df),
            "preview": preview_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
def train_model(request: TrainRequest, db: Session = Depends(get_db)):
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"数据文件不存在: {request.file_path}")
        
        df = data_service.load_csv(request.file_path)
        
        df_cleaned = data_service.clean_data(df, target_column=request.target_column)
        
        if len(df_cleaned) < 10:
            raise HTTPException(status_code=400, detail="数据清洗后样本量不足，请检查数据质量")
        
        X, y = data_service.prepare_features(df_cleaned, target_column=request.target_column)
        
        X_normalized, scaler = data_service.normalize_data(X, method=request.normalization_method)
        model_service.scaler = scaler
        data_service.scaler = scaler
        
        X_train, X_test, y_train, y_test = data_service.split_data(
            X_normalized, y, test_size=request.test_size
        )
        
        model_service.train_model(X_train, y_train, data_service.feature_columns, request.target_column)
        
        evaluation_metrics = model_service.evaluate_model(X_test, y_test)
        
        model_id = model_service.save_model(db, evaluation_metrics)
        
        residuals = model_service.get_residuals(X_normalized, y)
        model_service.save_residuals(db, residuals)
        
        feature_importance = model_service.get_feature_importance()
        
        feature_info = data_service.get_feature_info(df_cleaned)
        
        return {
            "success": True,
            "message": "模型训练完成",
            "model_id": model_id,
            "evaluation_metrics": evaluation_metrics,
            "feature_importance": feature_importance,
            "data_info": {
                "original_samples": len(df),
                "cleaned_samples": len(df_cleaned),
                "features": data_service.feature_columns,
                "target": request.target_column
            },
            "feature_statistics": feature_info["statistics"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
def predict(request: PredictionRequest, db: Session = Depends(get_db)):
    try:
        if request.model_id:
            model_service.load_model(db, request.model_id)
        else:
            latest_model = model_service.get_latest_model(db)
            if not latest_model:
                raise HTTPException(status_code=400, detail="没有找到已训练的模型，请先训练模型")
        
        expected_features = model_service.feature_columns
        for feature in expected_features:
            if feature not in request.features:
                raise HTTPException(status_code=400, detail=f"缺少特征: {feature}")
        
        if model_service.scaler:
            feature_values = []
            for col in expected_features:
                feature_values.append(request.features[col])
            
            sample = np.array(feature_values).reshape(1, -1)
            sample_normalized = model_service.scaler.transform(sample)
            prediction = model_service.predict(sample_normalized)
        else:
            feature_values = []
            for col in expected_features:
                feature_values.append(request.features[col])
            
            sample = np.array(feature_values).reshape(1, -1)
            prediction = model_service.predict(sample)
        
        feature_importance = model_service.get_feature_importance()
        
        return {
            "success": True,
            "predicted_price": round(prediction, 2),
            "features_used": request.features,
            "model_id": model_service.model_id,
            "feature_importance": feature_importance
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info/{model_id}")
def get_model_info(model_id: int, db: Session = Depends(get_db)):
    try:
        model_info = model_service.get_model_info(db, model_id)
        return {
            "success": True,
            "data": model_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest-model")
def get_latest_model(db: Session = Depends(get_db)):
    try:
        latest_model = model_service.get_latest_model(db)
        
        if not latest_model:
            return {
                "success": False,
                "message": "没有找到已训练的模型"
            }
        
        model_info = model_service.get_model_info(db, latest_model["model_id"])
        
        return {
            "success": True,
            "data": model_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-ranges")
def get_feature_ranges(file_path: str = "./data/housing_data.csv"):
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"数据文件不存在: {file_path}")
        
        df = data_service.load_csv(file_path)
        df_cleaned = data_service.clean_data(df)
        
        X, y = data_service.prepare_features(df_cleaned)
        
        ranges = data_service.get_feature_ranges(df_cleaned)
        
        feature_info = data_service.get_feature_info(df_cleaned)
        
        return {
            "success": True,
            "feature_ranges": ranges,
            "feature_info": feature_info,
            "target_column": data_service.target_column
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available-datasets")
def get_available_datasets():
    try:
        datasets = []
        if os.path.exists(DATA_DIR):
            for file in os.listdir(DATA_DIR):
                if file.endswith(".csv"):
                    file_path = os.path.join(DATA_DIR, file)
                    try:
                        df = data_service.load_csv(file_path)
                        datasets.append({
                            "filename": file,
                            "path": file_path,
                            "columns": list(df.columns),
                            "rows": len(df)
                        })
                    except:
                        pass
        
        return {
            "success": True,
            "datasets": datasets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
