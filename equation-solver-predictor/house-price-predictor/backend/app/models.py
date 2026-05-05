from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.sql import func
import json

from .database import Base


class ModelTrainingRecord(Base):
    __tablename__ = "model_training_records"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), default="linear_regression")
    dataset_size = Column(Integer, default=0)
    train_size = Column(Integer, default=0)
    test_size = Column(Integer, default=0)
    
    r2_score = Column(Float, default=0.0)
    mse = Column(Float, default=0.0)
    rmse = Column(Float, default=0.0)
    mae = Column(Float, default=0.0)
    
    coefficients = Column(JSON, nullable=True)
    intercept = Column(Float, default=0.0)
    
    feature_names = Column(JSON, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "dataset_size": self.dataset_size,
            "train_size": self.train_size,
            "test_size": self.test_size,
            "r2_score": self.r2_score,
            "mse": self.mse,
            "rmse": self.rmse,
            "mae": self.mae,
            "coefficients": self.coefficients,
            "intercept": self.intercept,
            "feature_names": self.feature_names,
            "feature_importance": self.feature_importance,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, nullable=True)
    
    input_features = Column(JSON, nullable=False)
    predicted_price = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "model_id": self.model_id,
            "input_features": self.input_features,
            "predicted_price": self.predicted_price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
