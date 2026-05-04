from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import date

from ..services import visa_query_service
from ..parsers import get_supported_countries, ParserException
from ..models import VisaStatus

router = APIRouter()


class VisaQueryRequest(BaseModel):
    country: str
    application_number: str
    use_cache: bool = True
    additional_params: Optional[Dict[str, Any]] = None


class VisaApplicationCreate(BaseModel):
    application_number: str
    country: str
    visa_type: str
    applicant_name: Optional[str] = None
    applicant_nationality: Optional[str] = None
    passport_number: Optional[str] = None
    submit_date: Optional[str] = None


@router.get("/countries")
async def list_supported_countries():
    countries = get_supported_countries()
    return {
        "countries": [
            {"code": code, "name": name}
            for code, name in countries.items()
        ]
    }


@router.post("/query")
async def query_visa_status(request: VisaQueryRequest):
    try:
        additional_params = request.additional_params or {}
        
        result = visa_query_service.query_status(
            country=request.country,
            application_number=request.application_number,
            use_cache=request.use_cache,
            **additional_params
        )
        
        return result
        
    except ParserException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/applications")
async def list_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    applications = visa_query_service.get_all_applications(skip=skip, limit=limit)
    
    return {
        "total": len(applications),
        "applications": [
            {
                "id": app.id,
                "application_number": app.application_number,
                "country": app.country,
                "visa_type": app.visa_type,
                "applicant_name": app.applicant_name,
                "status": app.status.value if isinstance(app.status, VisaStatus) else str(app.status),
                "status_details": app.status_details,
                "submit_date": app.submit_date.isoformat() if app.submit_date else None,
                "last_checked_at": app.last_checked_at.isoformat() if app.last_checked_at else None,
                "created_at": app.created_at.isoformat() if app.created_at else None,
            }
            for app in applications
        ]
    }


@router.get("/applications/{application_id}")
async def get_application(application_id: int):
    application = visa_query_service.get_application(application_id)
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "id": application.id,
        "application_number": application.application_number,
        "country": application.country,
        "visa_type": application.visa_type,
        "applicant_name": application.applicant_name,
        "applicant_nationality": application.applicant_nationality,
        "passport_number": application.passport_number,
        "status": application.status.value if isinstance(application.status, VisaStatus) else str(application.status),
        "status_details": application.status_details,
        "submit_date": application.submit_date.isoformat() if application.submit_date else None,
        "estimated_completion_date": application.estimated_completion_date.isoformat() if application.estimated_completion_date else None,
        "last_checked_at": application.last_checked_at.isoformat() if application.last_checked_at else None,
        "created_at": application.created_at.isoformat() if application.created_at else None,
        "updated_at": application.updated_at.isoformat() if application.updated_at else None,
        "extra_data": application.extra_data,
    }


@router.post("/applications")
async def create_application(request: VisaApplicationCreate):
    try:
        application = visa_query_service.create_application(
            application_number=request.application_number,
            country=request.country,
            visa_type=request.visa_type,
            applicant_name=request.applicant_name,
            applicant_nationality=request.applicant_nationality,
            passport_number=request.passport_number,
            submit_date=request.submit_date
        )
        
        return {
            "message": "Application created successfully",
            "application": {
                "id": application.id,
                "application_number": application.application_number,
                "country": application.country,
                "visa_type": application.visa_type,
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Creation failed: {str(e)}")


@router.put("/applications/{application_id}")
async def update_application(application_id: int, updates: Dict[str, Any]):
    application = visa_query_service.update_application(application_id, **updates)
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {
        "message": "Application updated successfully",
        "application": {
            "id": application.id,
            "application_number": application.application_number,
        }
    }


@router.delete("/applications/{application_id}")
async def delete_application(application_id: int):
    success = visa_query_service.delete_application(application_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"message": "Application deleted successfully"}


@router.post("/applications/{application_id}/refresh")
async def refresh_application_status(application_id: int):
    application = visa_query_service.get_application(application_id)
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    try:
        result = visa_query_service.query_status(
            country=application.country,
            application_number=application.application_number,
            use_cache=False
        )
        
        return {
            "message": "Status refreshed successfully",
            "result": result
        }
        
    except ParserException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.post("/cache/clean")
async def clean_expired_cache():
    deleted_count = visa_query_service.clear_expired_cache()
    return {"message": f"Cleaned {deleted_count} expired cache entries"}
