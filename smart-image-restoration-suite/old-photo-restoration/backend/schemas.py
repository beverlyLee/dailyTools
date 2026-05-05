from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class HistoryItemBase(BaseModel):
    source_image: Optional[str] = None
    result_image: str
    model: str
    scale: int = 4
    enable_inpainting: bool = True
    enable_colorization: bool = False
    mask_data: Optional[str] = None


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


class RestorationRequest(BaseModel):
    model: str = "realesrgan_x4plus"
    scale: int = 4
    enable_inpainting: bool = True
    enable_colorization: bool = False


class RestorationResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    result_url: Optional[str] = None
    process_time: Optional[float] = None
    original_size: Optional[dict] = None
    output_size: Optional[dict] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    models_available: List[str]
