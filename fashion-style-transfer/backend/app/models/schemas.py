from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class FashionCategory(str, Enum):
    HANFU = "汉服"
    QIPAO = "旗袍"


class Point(BaseModel):
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    confidence: float = Field(default=1.0, ge=0, le=1)


class Keypoints(BaseModel):
    nose: Optional[Point] = None
    left_eye: Optional[Point] = None
    right_eye: Optional[Point] = None
    left_ear: Optional[Point] = None
    right_ear: Optional[Point] = None
    left_shoulder: Optional[Point] = None
    right_shoulder: Optional[Point] = None
    left_elbow: Optional[Point] = None
    right_elbow: Optional[Point] = None
    left_wrist: Optional[Point] = None
    right_wrist: Optional[Point] = None
    left_hip: Optional[Point] = None
    right_hip: Optional[Point] = None
    left_knee: Optional[Point] = None
    right_knee: Optional[Point] = None
    left_ankle: Optional[Point] = None
    right_ankle: Optional[Point] = None


class FashionStyle(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: FashionCategory
    image: Optional[str] = None
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool = True
    message: str = "上传成功"
    data: Optional[Dict[str, Any]] = None


class KeypointsResponse(BaseModel):
    success: bool = True
    message: str = "检测成功"
    data: Dict[str, Any]


class StyleTransferRequest(BaseModel):
    source_image: str = Field(..., description="源图片路径或URL")
    target_fashion: Dict[str, Any] = Field(..., description="目标服饰风格")
    keypoints: Optional[Keypoints] = Field(default=None, description="人体关键点")
    strength: float = Field(default=0.8, ge=0, le=1, description="迁移强度")
    preserve_structure: bool = Field(default=True, description="保留姿态结构")
    negative_prompt: Optional[str] = Field(default=None, description="负面提示词")
    steps: int = Field(default=30, ge=10, le=100, description="推理步数")
    guidance_scale: float = Field(default=7.5, ge=1, le=20, description="引导尺度")
    seed: Optional[int] = Field(default=None, description="随机种子")


class InpaintRequest(BaseModel):
    image_path: str = Field(..., description="源图片路径")
    mask_points: List[List[Dict[str, float]]] = Field(..., description="遮罩点列表")
    prompt: str = Field(..., description="重绘提示词")
    strength: float = Field(default=0.6, ge=0, le=1, description="重绘强度")
    steps: int = Field(default=20, ge=10, le=100, description="推理步数")
    guidance_scale: float = Field(default=7.5, ge=1, le=20, description="引导尺度")


class StyleTransferResponse(BaseModel):
    success: bool = True
    message: str = "风格迁移成功"
    data: Dict[str, Any]


class HistoryRecordCreate(BaseModel):
    source_image: str
    result_image: str
    fashion_style: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class HistoryRecordResponse(BaseModel):
    id: int
    source_image: str
    result_image: str
    fashion_style: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: List[Dict[str, Any]]
    page: int
    page_size: int
    total: int


class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str
    timestamp: datetime


class ModelInfo(BaseModel):
    controlnet_model: str
    base_model: str
    device: str
    is_loaded: bool


class DownloadRequest(BaseModel):
    image_path: str
    quality: int = Field(default=100, ge=1, le=100)
    format: str = Field(default="png", pattern="^(png|jpg|jpeg|webp)$")


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[str] = None
