from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ..services.rag_service import rag_service
from ..models.document import RAGSearchResult, SimilarCaseResult


router = APIRouter(prefix="/rag", tags=["RAG"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = Query(5, ge=1, le=20)


@router.post("/search", response_model=RAGSearchResult)
def search_similar_cases(request: SearchRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    similar_cases = rag_service.search_similar_cases(request.query, request.top_k)
    
    similar_case_results = [
        SimilarCaseResult(
            title=case["title"],
            description=case["description"],
            similarity_score=case.get("similarity_score", 0.0),
            source=case.get("source")
        )
        for case in similar_cases
    ]
    
    legal_articles = rag_service.search_legal_articles(request.query)
    
    return RAGSearchResult(
        query=request.query,
        similar_cases=similar_case_results,
        legal_articles=legal_articles
    )


@router.get("/search")
def search_similar_cases_get(
    query: str = Query(..., description="Search query text"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to return")
):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    similar_cases = rag_service.search_similar_cases(query, top_k)
    
    similar_case_results = [
        SimilarCaseResult(
            title=case["title"],
            description=case["description"],
            similarity_score=case.get("similarity_score", 0.0),
            source=case.get("source")
        )
        for case in similar_cases
    ]
    
    legal_articles = rag_service.search_legal_articles(query)
    
    return RAGSearchResult(
        query=query,
        similar_cases=similar_case_results,
        legal_articles=legal_articles
    )


@router.get("/cases")
def get_all_cases():
    cases = rag_service.get_all_cases()
    return {"count": len(cases), "cases": cases}


@router.get("/cases/{case_id}")
def get_case_by_id(case_id: int):
    case = rag_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case with id {case_id} not found")
    return case


@router.post("/cases")
def add_case(case_data: Dict[str, Any]):
    required_fields = ["title", "description", "case_type"]
    for field in required_fields:
        if field not in case_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    success = rag_service.add_case_to_index(case_data)
    
    if success:
        return {"message": "Case added successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to add case")


@router.get("/legal-articles")
def search_legal_articles(query: str = Query(..., description="Query text to match legal articles")):
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    articles = rag_service.search_legal_articles(query)
    return {"count": len(articles), "legal_articles": articles}
