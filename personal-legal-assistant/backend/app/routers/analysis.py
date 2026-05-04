from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session

from ..database import get_session
from ..models.case import Case
from ..models.document import AnalysisResult
from ..services.nlp_service import nlp_service


router = APIRouter(prefix="/analysis", tags=["Analysis"])


class AnalysisRequest(BaseModel):
    text: str
    case_id: Optional[int] = None


@router.post("/analyze", response_model=AnalysisResult)
def analyze_case(
    request: AnalysisRequest,
    session: Session = Depends(get_session)
):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Analysis text cannot be empty")
    
    analysis_result = nlp_service.analyze_case(request.text)
    
    if request.case_id:
        case = session.get(Case, request.case_id)
        if case:
            if analysis_result.get("case_type"):
                case.case_type = analysis_result["case_type"]
            session.add(case)
            session.commit()
    
    return AnalysisResult(
        entities=analysis_result.get("entities", []),
        relations=analysis_result.get("relations", []),
        legal_articles=analysis_result.get("legal_articles", []),
        case_type=analysis_result.get("case_type")
    )


@router.post("/entities")
def extract_entities(request: AnalysisRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Analysis text cannot be empty")
    
    entities = nlp_service.extract_entities(request.text)
    return {"entities": entities}


@router.post("/relations")
def extract_relations(request: AnalysisRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Analysis text cannot be empty")
    
    entities = nlp_service.extract_entities(request.text)
    relations = nlp_service.extract_relations(request.text, entities)
    return {"relations": relations}


@router.post("/classify")
def classify_case_type(request: AnalysisRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Analysis text cannot be empty")
    
    case_type = nlp_service.classify_case_type(request.text)
    return {"case_type": case_type}


@router.post("/legal-articles")
def match_legal_articles(request: AnalysisRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Analysis text cannot be empty")
    
    case_type = nlp_service.classify_case_type(request.text)
    legal_articles = nlp_service.match_legal_articles(request.text, case_type)
    return {
        "case_type": case_type,
        "legal_articles": legal_articles
    }
