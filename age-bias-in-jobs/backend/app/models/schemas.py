from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class JobDescription(BaseModel):
    id: int
    industry: str
    company: str
    position: str
    salary: str
    job_description: str
    source: str


class AgeExtractionRequest(BaseModel):
    text: str = Field(..., description="要分析的职位描述文本")


class AgeExtractionResponse(BaseModel):
    has_age_limit: bool
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    generation: Optional[str] = None
    raw_matches: List[str] = Field(default_factory=list)
    is_fresh_grad: bool = False
    age_category: Optional[str] = None


class IndustryStatsRequest(BaseModel):
    industry: Optional[str] = None
    source: Optional[str] = None


class IndustryStatistics(BaseModel):
    industry: str
    total_jobs: int
    has_age_limit_count: int
    age_limit_ratio: float
    has_35_limit_count: int
    limit_35_ratio: float
    age_categories: Dict[str, int]


class OverallStatistics(BaseModel):
    total_jobs: int
    overall_age_limit_ratio: float
    industry_comparison: List[IndustryStatistics]
    most_biased_industry: Optional[str] = None
    least_biased_industry: Optional[str] = None


class FunnelDataRequest(BaseModel):
    industry: Optional[str] = None


class FunnelDataPoint(BaseModel):
    age_group: str
    candidates: int
    invitation_rate: float
    jd_exclusion_rate: float


class FunnelDataResponse(BaseModel):
    industry: str
    funnel_data: List[FunnelDataPoint]


class AISuggestionRequest(BaseModel):
    age: int = Field(..., ge=20, le=50, description="年龄")
    industry: str = Field(..., description="行业")
    position: str = Field(..., description="职位类型")
    years_of_experience: int = Field(..., ge=0, le=25, description="工作年限")
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    temperature: float = Field(0.7, ge=0.0, le=2.0)


class AISuggestionResponse(BaseModel):
    success: bool
    suggestion: Optional[str] = None
    error: Optional[str] = None


class APIStatus(BaseModel):
    status: str
    message: str
    version: str = "v2.0"
