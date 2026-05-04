from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models import SessionLocal
from ..services.proofreader_service import ProofreaderService
from ..services.format_checker_service import FormatCheckerService
from ..services.polish_service import PolishService

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ProofreadRequest(BaseModel):
    text: str

@router.post("/check", response_model=Dict[str, Any])
def check_document(request: ProofreadRequest):
    proofreader = ProofreaderService()
    corrections = proofreader.check_all(request.text)
    
    return {
        "success": True,
        "data": {
            "corrections": proofreader.to_dict_list(corrections),
            "total_count": len(corrections)
        }
    }

@router.post("/check/political-terms", response_model=Dict[str, Any])
def check_political_terms(request: ProofreadRequest):
    proofreader = ProofreaderService()
    corrections = proofreader.check_political_terms(request.text)
    
    return {
        "success": True,
        "data": {
            "corrections": proofreader.to_dict_list(corrections),
            "total_count": len(corrections)
        }
    }

@router.post("/check/collocations", response_model=Dict[str, Any])
def check_collocations(request: ProofreadRequest):
    proofreader = ProofreaderService()
    corrections = proofreader.check_fixed_collocations(request.text)
    
    return {
        "success": True,
        "data": {
            "corrections": proofreader.to_dict_list(corrections),
            "total_count": len(corrections)
        }
    }

@router.post("/check/punctuation", response_model=Dict[str, Any])
def check_punctuation(request: ProofreadRequest):
    proofreader = ProofreaderService()
    corrections = proofreader.check_punctuation(request.text)
    
    return {
        "success": True,
        "data": {
            "corrections": proofreader.to_dict_list(corrections),
            "total_count": len(corrections)
        }
    }

@router.post("/check/format", response_model=Dict[str, Any])
def check_format(request: ProofreadRequest):
    format_checker = FormatCheckerService()
    issues = format_checker.check_all(request.text)
    
    return {
        "success": True,
        "data": {
            "issues": format_checker.to_dict_list(issues),
            "total_count": len(issues)
        }
    }

@router.post("/check/format/title-hierarchy", response_model=Dict[str, Any])
def check_title_hierarchy(request: ProofreadRequest):
    format_checker = FormatCheckerService()
    issues = format_checker.check_title_hierarchy(request.text)
    
    return {
        "success": True,
        "data": {
            "issues": format_checker.to_dict_list(issues),
            "total_count": len(issues)
        }
    }

@router.post("/check/format/document-number", response_model=Dict[str, Any])
def check_document_number(request: ProofreadRequest):
    format_checker = FormatCheckerService()
    issues = format_checker.check_document_number(request.text)
    
    return {
        "success": True,
        "data": {
            "issues": format_checker.to_dict_list(issues),
            "total_count": len(issues)
        }
    }

@router.post("/check/format/red-head", response_model=Dict[str, Any])
def check_red_head(request: ProofreadRequest):
    format_checker = FormatCheckerService()
    issues = format_checker.check_red_head_format(request.text)
    
    return {
        "success": True,
        "data": {
            "issues": format_checker.to_dict_list(issues),
            "total_count": len(issues)
        }
    }

@router.post("/polish", response_model=Dict[str, Any])
def polish_document(request: ProofreadRequest):
    polish_service = PolishService()
    suggestions = polish_service.polish_all(request.text)
    
    return {
        "success": True,
        "data": {
            "suggestions": polish_service.to_dict_list(suggestions),
            "total_count": len(suggestions)
        }
    }

@router.post("/polish/colloquial", response_model=Dict[str, Any])
def polish_colloquial(request: ProofreadRequest):
    polish_service = PolishService()
    suggestions = polish_service.check_colloquial_expressions(request.text)
    
    return {
        "success": True,
        "data": {
            "suggestions": polish_service.to_dict_list(suggestions),
            "total_count": len(suggestions)
        }
    }

@router.post("/polish/phrases", response_model=Dict[str, Any])
def polish_phrases(request: ProofreadRequest):
    polish_service = PolishService()
    suggestions = polish_service.check_formal_phrases(request.text)
    
    return {
        "success": True,
        "data": {
            "suggestions": polish_service.to_dict_list(suggestions),
            "total_count": len(suggestions)
        }
    }

@router.post("/polish/sentence", response_model=Dict[str, Any])
def polish_sentence(request: ProofreadRequest):
    polish_service = PolishService()
    suggestions = polish_service.check_sentence_structure(request.text)
    
    return {
        "success": True,
        "data": {
            "suggestions": polish_service.to_dict_list(suggestions),
            "total_count": len(suggestions)
        }
    }

@router.post("/full-check", response_model=Dict[str, Any])
def full_check(request: ProofreadRequest):
    proofreader = ProofreaderService()
    format_checker = FormatCheckerService()
    polish_service = PolishService()
    
    corrections = proofreader.check_all(request.text)
    format_issues = format_checker.check_all(request.text)
    polish_suggestions = polish_service.polish_all(request.text)
    
    return {
        "success": True,
        "data": {
            "proofreading": {
                "corrections": proofreader.to_dict_list(corrections),
                "count": len(corrections)
            },
            "format_check": {
                "issues": format_checker.to_dict_list(format_issues),
                "count": len(format_issues)
            },
            "polishing": {
                "suggestions": polish_service.to_dict_list(polish_suggestions),
                "count": len(polish_suggestions)
            },
            "total_issues": len(corrections) + len(format_issues) + len(polish_suggestions)
        }
    }
