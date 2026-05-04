from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from pydantic import BaseModel
import json

from ..services import checklist_service

router = APIRouter()


class ChecklistRequest(BaseModel):
    country: str
    visa_type: str
    nationality: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


@router.get("/countries")
async def list_countries():
    countries = checklist_service.get_countries()
    return {"countries": countries}


@router.get("/countries/{country_code}/visa-types")
async def list_visa_types(country_code: str):
    visa_types = checklist_service.get_visa_types(country_code)
    
    if not visa_types:
        raise HTTPException(
            status_code=404,
            detail=f"Country '{country_code}' not found or no visa types available"
        )
    
    return {
        "country": country_code,
        "visa_types": visa_types
    }


@router.post("/generate")
async def generate_checklist(request: ChecklistRequest):
    try:
        checklist = checklist_service.generate_checklist(
            country_code=request.country,
            visa_type=request.visa_type,
            nationality=request.nationality,
            context=request.context
        )
        
        return checklist
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate checklist: {str(e)}")


@router.get("/generate")
async def generate_checklist_get(
    country: str = Query(..., description="Country code (e.g., usa, schengen, uk)"),
    visa_type: str = Query(..., description="Visa type code (e.g., b1_b2, tourist)"),
    nationality: Optional[str] = Query(None, description="Applicant nationality"),
    context: Optional[str] = Query(None, description="JSON string of context parameters")
):
    context_dict = None
    if context:
        try:
            context_dict = json.loads(context)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid context JSON")
    
    try:
        checklist = checklist_service.generate_checklist(
            country_code=country,
            visa_type=visa_type,
            nationality=nationality,
            context=context_dict
        )
        
        return checklist
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate checklist: {str(e)}")


@router.get("/countries/{country_code}/visa-types/{visa_type}/documents")
async def get_all_documents(
    country_code: str,
    visa_type: str
):
    try:
        documents = checklist_service.get_all_documents_flat(
            country_code=country_code,
            visa_type=visa_type
        )
        
        return {
            "country": country_code,
            "visa_type": visa_type,
            "total_documents": len(documents),
            "documents": documents
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/countries/{country_code}/visa-types/{visa_type}/documents/{document_id}")
async def get_document_details(
    country_code: str,
    visa_type: str,
    document_id: str
):
    doc = checklist_service.get_document_details(
        country_code=country_code,
        visa_type=visa_type,
        document_id=document_id
    )
    
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document '{document_id}' not found for {country_code}/{visa_type}"
        )
    
    ocr_fields = checklist_service.get_ocr_fields_for_document(
        country_code=country_code,
        visa_type=visa_type,
        document_id=document_id
    )
    
    doc["ocr_fields"] = ocr_fields
    return doc


@router.get("/countries/{country_code}/visa-types/{visa_type}/documents/{document_id}/ocr-fields")
async def get_document_ocr_fields(
    country_code: str,
    visa_type: str,
    document_id: str
):
    ocr_fields = checklist_service.get_ocr_fields_for_document(
        country_code=country_code,
        visa_type=visa_type,
        document_id=document_id
    )
    
    return {
        "country": country_code,
        "visa_type": visa_type,
        "document_id": document_id,
        "ocr_fields": ocr_fields
    }
