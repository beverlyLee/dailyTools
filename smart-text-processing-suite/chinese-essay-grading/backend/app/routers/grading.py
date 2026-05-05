from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import json

from ..database import get_db
from ..models import Essay, Grading, EssayError, SyntaxAnalysis
from ..services.grading_service import get_grading_service, GradingService
from ..services.error_detection import get_error_detection_service, ErrorDetectionService, error_to_dict
from ..services.nlp_service import get_nlp_service

router = APIRouter()


class GradingResponse(BaseModel):
    grading: Dict[str, Any]
    errors: List[Dict[str, Any]]
    syntax_analysis: List[Dict[str, Any]]


def _parse_grade_level(grade_str: Optional[str]) -> str:
    if not grade_str:
        return 'primary'
    
    grade_lower = grade_str.lower()
    if '小学' in grade_lower or 'primary' in grade_lower:
        return 'primary'
    elif '初中' in grade_lower or 'middle' in grade_lower or '初一' in grade_lower or '初二' in grade_lower or '初三' in grade_lower:
        return 'middle'
    elif '高中' in grade_lower or 'high' in grade_lower or '高一' in grade_lower or '高二' in grade_lower or '高三' in grade_lower:
        return 'high'
    
    return 'primary'


def _perform_grading(
    essay_id: int,
    db: Session,
    grading_service: GradingService,
    error_service: ErrorDetectionService,
    nlp_service
):
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    if not essay:
        return
    
    old_grading = db.query(Grading).filter(Grading.essay_id == essay_id).first()
    if old_grading:
        db.delete(old_grading)
    
    db.query(EssayError).filter(EssayError.essay_id == essay_id).delete()
    db.query(SyntaxAnalysis).filter(SyntaxAnalysis.essay_id == essay_id).delete()
    db.commit()
    
    grade_level = _parse_grade_level(essay.grade)
    grading_result = grading_service.grade(essay.content, grade_level)
    
    grading = Grading(
        essay_id=essay_id,
        content_score=grading_result.content_score,
        language_score=grading_result.language_score,
        structure_score=grading_result.structure_score,
        total_score=grading_result.total_score,
        content_comment=grading_result.content_comment,
        language_comment=grading_result.language_comment,
        structure_comment=grading_result.structure_comment,
        overall_comment=grading_result.overall_comment,
        suggestions=grading_result.suggestions,
        highlights=grading_result.highlights,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(grading)
    
    errors = error_service.detect_all(essay.content)
    for error in errors:
        essay_error = EssayError(
            essay_id=essay_id,
            error_type=error.error_type,
            original_text=error.original_text,
            corrected_text=error.corrected_text,
            explanation=error.explanation,
            position_start=error.position_start,
            position_end=error.position_end,
            line_number=error.line_number,
            severity=error.severity,
            confidence=error.confidence,
            created_at=datetime.utcnow()
        )
        db.add(essay_error)
    
    try:
        syntax_results = nlp_service.dependency_parse(essay.content)
        for i, item in enumerate(syntax_results):
            syntax_analysis = SyntaxAnalysis(
                essay_id=essay_id,
                word=item.get('word', ''),
                pos=item.get('pos', ''),
                dep=item.get('dep', ''),
                head=item.get('head', ''),
                head_idx=item.get('head_idx'),
                idx=item.get('idx', i),
                sentence_idx=0,
                explanation=item.get('explanation'),
                created_at=datetime.utcnow()
            )
            db.add(syntax_analysis)
    except Exception as e:
        print(f"句法分析失败: {e}")
    
    essay.is_graded = 1
    essay.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(grading)


@router.post("/{essay_id}/grade", response_model=Dict[str, Any])
def grade_essay(
    essay_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    essay = db.query(Essay).filter(Essay.id == essay_id).first()
    
    if not essay:
        raise HTTPException(status_code=404, detail="作文不存在")
    
    grading_service = get_grading_service()
    error_service = get_error_detection_service()
    nlp_service = get_nlp_service()
    
    _perform_grading(essay_id, db, grading_service, error_service, nlp_service)
    
    grading = db.query(Grading).filter(Grading.essay_id == essay_id).first()
    errors = db.query(EssayError).filter(EssayError.essay_id == essay_id).all()
    syntax_analysis = db.query(SyntaxAnalysis).filter(SyntaxAnalysis.essay_id == essay_id).all()
    
    grading_dict = grading_service.grade_to_dict(
        grading_service.grade(essay.content, _parse_grade_level(essay.grade))
    )
    grading_dict['id'] = grading.id
    grading_dict['created_at'] = grading.created_at.isoformat() if grading.created_at else None
    
    errors_dict = [error_to_dict(e) for e in errors]
    syntax_dict = [{
        'word': sa.word,
        'pos': sa.pos,
        'dep': sa.dep,
        'head': sa.head,
        'head_idx': sa.head_idx,
        'idx': sa.idx,
        'sentence_idx': sa.sentence_idx,
        'explanation': sa.explanation
    } for sa in syntax_analysis]
    
    return {
        "success": True,
        "data": {
            "grading": grading_dict,
            "errors": errors_dict,
            "syntax_analysis": syntax_dict
        }
    }


@router.get("/{essay_id}", response_model=Dict[str, Any])
def get_grading_by_essay_id(
    essay_id: int,
    db: Session = Depends(get_db)
):
    grading = db.query(Grading).filter(Grading.essay_id == essay_id).first()
    
    if not grading:
        raise HTTPException(status_code=404, detail="该作文尚未批改")
    
    errors = db.query(EssayError).filter(EssayError.essay_id == essay_id).all()
    syntax_analysis = db.query(SyntaxAnalysis).filter(SyntaxAnalysis.essay_id == essay_id).all()
    
    grading_service = get_grading_service()
    
    grading_dict = {
        'id': grading.id,
        'essay_id': grading.essay_id,
        'content_score': grading.content_score,
        'language_score': grading.language_score,
        'structure_score': grading.structure_score,
        'total_score': grading.total_score,
        'content_comment': grading.content_comment,
        'language_comment': grading.language_comment,
        'structure_comment': grading.structure_comment,
        'overall_comment': grading.overall_comment,
        'suggestions': grading.suggestions,
        'highlights': grading.highlights,
        'created_at': grading.created_at.isoformat() if grading.created_at else None,
        'updated_at': grading.updated_at.isoformat() if grading.updated_at else None
    }
    
    errors_dict = [error_to_dict(e) for e in errors]
    syntax_dict = [{
        'word': sa.word,
        'pos': sa.pos,
        'dep': sa.dep,
        'head': sa.head,
        'head_idx': sa.head_idx,
        'idx': sa.idx,
        'sentence_idx': sa.sentence_idx,
        'explanation': sa.explanation
    } for sa in syntax_analysis]
    
    return {
        "success": True,
        "data": {
            "grading": grading_dict,
            "errors": errors_dict,
            "syntax_analysis": syntax_dict
        }
    }


@router.post("/analyze", response_model=Dict[str, Any])
def analyze_text(
    request: dict,
    db: Session = Depends(get_db)
):
    text = request.get('text', '')
    if not text:
        raise HTTPException(status_code=400, detail="请提供文本内容")
    
    grading_service = get_grading_service()
    error_service = get_error_detection_service()
    nlp_service = get_nlp_service()
    
    grade_level = _parse_grade_level(request.get('grade'))
    grading_result = grading_service.grade(text, grade_level)
    
    errors = error_service.detect_all(text)
    
    try:
        syntax_results = nlp_service.dependency_parse(text)
    except Exception as e:
        print(f"句法分析失败: {e}")
        syntax_results = []
    
    return {
        "success": True,
        "data": {
            "grading": grading_service.grade_to_dict(grading_result),
            "errors": [error_to_dict(e) for e in errors],
            "syntax_analysis": syntax_results
        }
    }
