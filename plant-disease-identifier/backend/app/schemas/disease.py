from pydantic import BaseModel, Field
from typing import Optional, List


class DiseaseInfo(BaseModel):
    disease_name: str = Field(..., description="病害名称")
    confidence: float = Field(..., description="识别置信度", ge=0, le=1)
    confidence_percent: str = Field(..., description="置信度百分比格式")
    
    class Config:
        from_attributes = True


class TreatmentInfo(BaseModel):
    disease_name: str = Field(..., description="病害名称")
    symptoms: List[str] = Field(..., description="病害症状")
    prevention_methods: List[str] = Field(..., description="预防方法")
    treatment_methods: List[str] = Field(..., description="治疗方法")
    recommended_pesticides: List[str] = Field(..., description="推荐药剂")
    notes: Optional[str] = Field(None, description="注意事项")
    
    class Config:
        from_attributes = True


class DiseaseResponse(BaseModel):
    success: bool = Field(..., description="是否识别成功")
    primary_disease: DiseaseInfo = Field(..., description="主要识别结果")
    other_candidates: List[DiseaseInfo] = Field(default=[], description="其他候选结果")
    treatment_info: Optional[TreatmentInfo] = Field(None, description="防治建议信息")
    
    class Config:
        from_attributes = True


class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="服务状态")
    model_loaded: bool = Field(..., description="模型是否已加载")
    model_path: str = Field(..., description="模型路径")
    database_connected: bool = Field(..., description="数据库是否连接")
    
    class Config:
        from_attributes = True
