from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HistoryItemBase(BaseModel):
    source_image: Optional[str] = None
    result_image: str
    costume_type: str
    detail_style: str = "none"
    pose_points: Optional[str] = None


class HistoryItemCreate(HistoryItemBase):
    pass


class HistoryItemResponse(HistoryItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    success: bool
    items: List[HistoryItemResponse]
    total: int
    page: int
    size: int


class SettingsCreate(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SettingsResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TryOnRequest(BaseModel):
    costume_type: str
    detail_style: str = "none"
    image_source: str = "model"
    pose_points: Optional[str] = None


class TryOnResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    result_url: Optional[str] = None
    process_time: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    models_available: List[str]
