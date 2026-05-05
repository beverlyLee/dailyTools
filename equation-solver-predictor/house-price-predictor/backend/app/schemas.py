from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class FeatureInfo(BaseModel):
    name: str
    display_name: str
    description: str
    min_value: float
    max_value: float
    default_value: float


class FeaturesInfoResponse(BaseModel):
    success: bool = True
    data: List[FeatureInfo]


class PredictionRequest(BaseModel):
    features: Dict[str, float] = Field(..., description="输入特征字典")


class PredictionResponse(BaseModel):
    success: bool = True
    message: str = "预测成功"
    data: Dict[str, Any]


class TrainModelRequest(BaseModel):
    test_size: float = Field(default=0.2, ge=0.1, le=0.5, description="测试集比例")
    random_state: int = Field(default=42, description="随机种子")
    use_custom_data: bool = Field(default=False, description="是否使用自定义数据")


class TrainModelResponse(BaseModel):
    success: bool = True
    message: str = "模型训练成功"
    data: Dict[str, Any]


class ModelMetrics(BaseModel):
    r2_score: float
    mse: float
    rmse: float
    mae: float


class FeatureImportance(BaseModel):
    name: str
    coefficient: float
    absolute_value: float
    importance: float


class DatasetInfoResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class ResidualDataResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]
