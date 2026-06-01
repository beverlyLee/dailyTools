from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.models.schemas import (
    JobDescription, AgeExtractionRequest, AgeExtractionResponse,
    IndustryStatistics, FunnelDataResponse,
    AISuggestionRequest, AISuggestionResponse, APIStatus, OverallStatistics
)
from app.services.data_service import DataService
from app.services.nlp_service import NLPService
from app.services.analytics_service import AnalyticsService
from app.services.ai_service import AIService
from app.core.config import settings


router = APIRouter()


data_service = DataService(settings.DATA_FILE_PATH)
nlp_service = NLPService()
analytics_service = AnalyticsService(nlp_service)
ai_service = AIService()


@router.get("/status", response_model=APIStatus)
async def get_status():
    return APIStatus(
        status="running",
        message="招聘市场年龄歧视分析系统API运行正常",
        version="v2.0"
    )


@router.get("/jobs", response_model=List[JobDescription])
async def get_jobs(industry: Optional[str] = None, source: Optional[str] = None):
    df = data_service.get_all_jobs(industry=industry, source=source)
    jobs = df.to_dict('records')
    return [JobDescription(**job) for job in jobs]


@router.get("/jobs/sample", response_model=List[JobDescription])
async def get_sample_jobs(count: int = 10):
    jobs = data_service.get_sample_jobs(count)
    return [JobDescription(**job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=JobDescription)
async def get_job(job_id: int):
    job = data_service.get_job_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="职位不存在")
    return JobDescription(**job)


@router.get("/industries")
async def get_industries():
    return {"industries": data_service.get_industries()}


@router.get("/sources")
async def get_sources():
    return {"sources": data_service.get_sources()}


@router.post("/nlp/extract-age", response_model=AgeExtractionResponse)
async def extract_age_info(request: AgeExtractionRequest):
    result = nlp_service.extract_age_info(request.text)
    return AgeExtractionResponse(**result)


@router.get("/statistics/overall", response_model=OverallStatistics)
async def get_overall_statistics(source: Optional[str] = None):
    df = data_service.get_all_jobs(source=source)
    result = analytics_service.get_overall_statistics(df, source=source)
    return OverallStatistics(**result)


@router.get("/statistics/industry")
async def get_industry_statistics(industry: Optional[str] = None, source: Optional[str] = None):
    df = data_service.get_all_jobs(source=source)
    result = analytics_service.get_industry_statistics(df, industry=industry)
    return IndustryStatistics(**result)


@router.get("/funnel", response_model=FunnelDataResponse)
async def get_funnel_data(industry: Optional[str] = None, source: Optional[str] = None):
    df = data_service.get_all_jobs(source=source)
    result = analytics_service.get_funnel_data(df, industry=industry)
    return FunnelDataResponse(**result)


@router.get("/funnel/compare")
async def compare_industries_funnel(source: Optional[str] = None):
    df = data_service.get_all_jobs(source=source)
    result = analytics_service.compare_industries_funnel(df)
    return {"comparison": result}


@router.post("/ai/suggestion", response_model=AISuggestionResponse)
async def get_ai_suggestion(request: AISuggestionRequest):
    try:
        suggestion, error = ai_service.generate_suggestion(
            age=request.age,
            industry=request.industry,
            position=request.position,
            years_of_experience=request.years_of_experience,
            api_key=request.api_key,
            model_name=request.model_name,
            temperature=request.temperature
        )
        
        if error:
            return AISuggestionResponse(success=False, error=error)
        
        return AISuggestionResponse(success=True, suggestion=suggestion)
    except Exception as e:
        return AISuggestionResponse(success=False, error=f"服务器错误: {str(e)}")


@router.post("/ai/test-connection")
async def test_ai_connection(api_key: str, model_name: Optional[str] = None):
    try:
        success, message = ai_service.test_connection(
            api_key=api_key,
            model_name=model_name
        )
        
        return {
            "success": success,
            "message": message if not success else "连接成功",
            "result": message if success else None
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "result": None
        }
