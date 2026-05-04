from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class HealthRecordBase(BaseModel):
    health_status: str = Field(default="健康", description="健康状况")
    identified_disease: Optional[str] = Field(None, description="识别出的病害")
    confidence: Optional[str] = Field(None, description="识别置信度")
    image_url: Optional[str] = Field(None, description="图片URL")
    treatment_suggestion: Optional[str] = Field(None, description="防治建议")
    notes: Optional[str] = Field(None, description="备注")


class HealthRecordCreate(HealthRecordBase):
    plant_id: int = Field(..., description="植物ID")


class HealthRecordResponse(HealthRecordBase):
    id: int
    plant_id: int
    check_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class PlantBase(BaseModel):
    name: str = Field(..., description="植物名称", max_length=100)
    plant_type: str = Field(..., description="植物类型", max_length=100)
    planting_date: datetime = Field(..., description="种植时间")
    location: Optional[str] = Field(None, description="种植位置", max_length=200)
    notes: Optional[str] = Field(None, description="备注信息")


class PlantCreate(PlantBase):
    pass


class PlantUpdate(BaseModel):
    name: Optional[str] = Field(None, description="植物名称", max_length=100)
    plant_type: Optional[str] = Field(None, description="植物类型", max_length=100)
    planting_date: Optional[datetime] = Field(None, description="种植时间")
    location: Optional[str] = Field(None, description="种植位置", max_length=200)
    notes: Optional[str] = Field(None, description="备注信息")
    current_health_status: Optional[str] = Field(None, description="当前健康状况", max_length=50)


class PlantResponse(PlantBase):
    id: int
    current_health_status: str = Field(default="健康", description="当前健康状况")
    created_at: datetime
    updated_at: datetime
    health_records: List[HealthRecordResponse] = []
    
    class Config:
        from_attributes = True
