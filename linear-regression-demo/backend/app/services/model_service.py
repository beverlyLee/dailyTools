import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sqlalchemy.orm import Session
from app.database import ModelMetadata, FeatureImportance, ResidualData


class ModelService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_columns = []
        self.target_column = ""
        self.model_id = None
        self.model_dir = "./models"
        self._ensure_model_dir()
    
    def _ensure_model_dir(self):
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
    
    def train_model(self, X_train: np.ndarray, y_train: pd.Series, 
                    feature_columns: List[str], target_column: str) -> LinearRegression:
        self.feature_columns = feature_columns
        self.target_column = target_column
        
        self.model = LinearRegression()
        self.model.fit(X_train, y_train)
        
        return self.model
    
    def evaluate_model(self, X_test: np.ndarray, y_test: pd.Series) -> Dict[str, float]:
        if not self.model:
            raise Exception("模型未训练，请先调用 train_model")
        
        y_pred = self.model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        return {
            "mse": float(mse),
            "rmse": float(rmse),
            "r2_score": float(r2)
        }
    
    def get_feature_importance(self) -> List[Dict[str, Any]]:
        if not self.model:
            raise Exception("模型未训练，请先调用 train_model")
        
        coefficients = self.model.coef_
        intercept = self.model.intercept_
        
        abs_coefficients = np.abs(coefficients)
        total_importance = np.sum(abs_coefficients)
        
        importance_list = []
        for i, (feature, coef) in enumerate(zip(self.feature_columns, coefficients)):
            importance_score = abs_coefficients[i] / total_importance if total_importance > 0 else 0
            importance_list.append({
                "feature": feature,
                "coefficient": float(coef),
                "importance_score": float(importance_score),
                "absolute_coefficient": float(abs_coefficients[i])
            })
        
        importance_list.sort(key=lambda x: x["importance_score"], reverse=True)
        
        return importance_list
    
    def get_residuals(self, X: np.ndarray, y: pd.Series) -> List[Dict[str, float]]:
        if not self.model:
            raise Exception("模型未训练，请先调用 train_model")
        
        y_pred = self.model.predict(X)
        residuals = y - y_pred
        
        residual_list = []
        for actual, predicted, residual in zip(y, y_pred, residuals):
            residual_list.append({
                "actual": float(actual),
                "predicted": float(predicted),
                "residual": float(residual)
            })
        
        return residual_list
    
    def predict(self, X: np.ndarray) -> float:
        if not self.model:
            raise Exception("模型未训练，请先调用 train_model")
        
        prediction = self.model.predict(X)
        return float(prediction[0])
    
    def save_model(self, db: Session, evaluation_metrics: Dict[str, float]) -> int:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = f"linear_regression_{timestamp}"
        
        model_path = os.path.join(self.model_dir, f"{model_name}.joblib")
        scaler_path = os.path.join(self.model_dir, f"{model_name}_scaler.joblib")
        
        joblib.dump(self.model, model_path)
        if self.scaler:
            joblib.dump(self.scaler, scaler_path)
        
        model_metadata = ModelMetadata(
            model_name=model_name,
            r2_score=evaluation_metrics.get("r2_score", 0),
            mse=evaluation_metrics.get("mse", 0),
            features=",".join(self.feature_columns),
            target=self.target_column,
            model_path=model_path,
            scaler_path=scaler_path if self.scaler else ""
        )
        
        db.add(model_metadata)
        db.commit()
        db.refresh(model_metadata)
        
        self.model_id = model_metadata.id
        
        feature_importance = self.get_feature_importance()
        for fi in feature_importance:
            db_feature = FeatureImportance(
                model_id=self.model_id,
                feature_name=fi["feature"],
                coefficient=fi["coefficient"],
                importance_score=fi["importance_score"]
            )
            db.add(db_feature)
        
        db.commit()
        
        return self.model_id
    
    def load_model(self, db: Session, model_id: int):
        model_metadata = db.query(ModelMetadata).filter(ModelMetadata.id == model_id).first()
        
        if not model_metadata:
            raise Exception(f"模型 ID {model_id} 不存在")
        
        self.model = joblib.load(model_metadata.model_path)
        
        if model_metadata.scaler_path and os.path.exists(model_metadata.scaler_path):
            self.scaler = joblib.load(model_metadata.scaler_path)
        
        self.feature_columns = model_metadata.features.split(",")
        self.target_column = model_metadata.target
        self.model_id = model_id
        
        return {
            "model_id": model_id,
            "model_name": model_metadata.model_name,
            "r2_score": model_metadata.r2_score,
            "mse": model_metadata.mse,
            "features": self.feature_columns,
            "target": self.target_column
        }
    
    def get_latest_model(self, db: Session):
        latest_model = db.query(ModelMetadata).order_by(ModelMetadata.id.desc()).first()
        
        if not latest_model:
            return None
        
        return self.load_model(db, latest_model.id)
    
    def save_residuals(self, db: Session, residuals: List[Dict[str, float]]):
        if not self.model_id:
            raise Exception("请先保存模型以获取 model_id")
        
        for res in residuals:
            db_residual = ResidualData(
                model_id=self.model_id,
                actual_value=res["actual"],
                predicted_value=res["predicted"],
                residual=res["residual"]
            )
            db.add(db_residual)
        
        db.commit()
    
    def get_model_info(self, db: Session, model_id: int) -> Dict[str, Any]:
        model_metadata = db.query(ModelMetadata).filter(ModelMetadata.id == model_id).first()
        
        if not model_metadata:
            raise Exception(f"模型 ID {model_id} 不存在")
        
        feature_importance = db.query(FeatureImportance).filter(
            FeatureImportance.model_id == model_id
        ).all()
        
        residuals = db.query(ResidualData).filter(
            ResidualData.model_id == model_id
        ).all()
        
        return {
            "model_metadata": {
                "id": model_metadata.id,
                "model_name": model_metadata.model_name,
                "training_date": model_metadata.training_date.isoformat() if model_metadata.training_date else None,
                "r2_score": model_metadata.r2_score,
                "mse": model_metadata.mse,
                "features": model_metadata.features.split(","),
                "target": model_metadata.target
            },
            "feature_importance": [
                {
                    "feature": fi.feature_name,
                    "coefficient": fi.coefficient,
                    "importance_score": fi.importance_score
                }
                for fi in feature_importance
            ],
            "residuals": [
                {
                    "actual": r.actual_value,
                    "predicted": r.predicted_value,
                    "residual": r.residual
                }
                for r in residuals
            ]
        }
