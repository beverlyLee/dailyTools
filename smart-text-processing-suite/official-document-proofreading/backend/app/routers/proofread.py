from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime

from ..database import get_db
from ..models import Document, DocumentVersion, ProofreadCorrection, PolishSuggestion
from ..schemas import (
    ProofreadRequest,
    ProofreadResultResponse,
    CorrectionItem,
    FormatCheckRequest,
    CorrectionApplyRequest,
    BatchCorrectionApplyRequest,
    CorrectionApplyResponse
)
from ..services.proofread_service import (
    get_proofread_service,
    ProofreadService,
    CorrectionResult,
    proofread_result_to_dict
)
from ..services.format_checker import get_format_checker

router = APIRouter(prefix="/api/proofread", tags=["校对服务"])


@router.post("/analyze", response_model=ProofreadResultResponse)
def analyze_text(
    request: ProofreadRequest,
    db: Session = Depends(get_db),
    proofread_service: ProofreadService = Depends(get_proofread_service)
):
    result = proofread_service.proofread(
        text=request.text,
        options=request.options
    )
    
    if request.document_id:
        document = db.query(Document).filter(Document.id == request.document_id).first()
        if document:
            for correction in result.corrections:
                db_correction = ProofreadCorrection(
                    document_id=document.id,
                    correction_type=correction.category,
                    original_text=correction.original_text,
                    suggested_text=correction.suggested_text,
                    position_start=correction.position_start,
                    position_end=correction.position_end,
                    explanation=correction.explanation,
                    category=correction.category,
                    severity=correction.severity,
                    confidence=correction.confidence
                )
                db.add(db_correction)
            
            for suggestion in result.polish_suggestions:
                db_suggestion = PolishSuggestion(
                    document_id=document.id,
                    category=suggestion.category,
                    original_phrase=suggestion.original_phrase,
                    suggested_phrase=suggestion.suggested_phrase,
                    position_start=suggestion.position_start,
                    position_end=suggestion.position_end,
                    explanation=suggestion.explanation,
                    confidence=int(suggestion.confidence * 100)
                )
                db.add(db_suggestion)
            
            db.commit()
    
    return proofread_result_to_dict(result)


@router.post("/document/{document_id}/analyze", response_model=ProofreadResultResponse)
def analyze_document(
    document_id: int,
    options: Optional[Dict[str, bool]] = None,
    db: Session = Depends(get_db),
    proofread_service: ProofreadService = Depends(get_proofread_service)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    result = proofread_service.proofread(
        text=document.current_content,
        options=options
    )
    
    for correction in result.corrections:
        db_correction = ProofreadCorrection(
            document_id=document.id,
            correction_type=correction.category,
            original_text=correction.original_text,
            suggested_text=correction.suggested_text,
            position_start=correction.position_start,
            position_end=correction.position_end,
            explanation=correction.explanation,
            category=correction.category,
            severity=correction.severity,
            confidence=correction.confidence
        )
        db.add(db_correction)
    
    for suggestion in result.polish_suggestions:
        db_suggestion = PolishSuggestion(
            document_id=document.id,
            category=suggestion.category,
            original_phrase=suggestion.original_phrase,
            suggested_phrase=suggestion.suggested_phrase,
            position_start=suggestion.position_start,
            position_end=suggestion.position_end,
            explanation=suggestion.explanation,
            confidence=int(suggestion.confidence * 100)
        )
        db.add(db_suggestion)
    
    db.commit()
    
    return proofread_result_to_dict(result)


@router.post("/format/check")
def check_format(
    request: FormatCheckRequest
):
    format_checker = get_format_checker()
    
    if request.format_type:
        result = format_checker.check_format_type(
            text=request.text,
            format_type=request.format_type
        )
    else:
        result = format_checker.check_all(text=request.text)
    
    return result


@router.post("/apply-correction", response_model=CorrectionApplyResponse)
def apply_single_correction(
    request: CorrectionApplyRequest,
    db: Session = Depends(get_db),
    proofread_service: ProofreadService = Depends(get_proofread_service)
):
    correction = CorrectionResult(
        rule_id=request.correction.rule_id,
        rule_name=request.correction.rule_name,
        category=request.correction.category,
        original_text=request.correction.original_text,
        suggested_text=request.correction.suggested_text,
        position_start=request.correction.position_start,
        position_end=request.correction.position_end,
        explanation=request.correction.explanation,
        severity=request.correction.severity,
        confidence=request.correction.confidence,
        source=request.correction.source
    )
    
    try:
        corrected_text = proofread_service.apply_correction(
            text=request.text,
            correction=correction
        )
        
        if request.document_id:
            document = db.query(Document).filter(Document.id == request.document_id).first()
            if document:
                new_version = document.current_version + 1
                db_version = DocumentVersion(
                    document_id=document.id,
                    version_number=new_version,
                    content=corrected_text,
                    change_description=f"应用修正: {correction.rule_name}",
                    word_count=len(corrected_text)
                )
                db.add(db_version)
                document.current_content = corrected_text
                document.current_version = new_version
                db.commit()
        
        return CorrectionApplyResponse(
            original_text=request.text,
            corrected_text=corrected_text,
            applied_count=1,
            success=True,
            message="修正已成功应用"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"应用修正失败: {str(e)}")


@router.post("/apply-corrections", response_model=CorrectionApplyResponse)
def apply_batch_corrections(
    request: BatchCorrectionApplyRequest,
    db: Session = Depends(get_db),
    proofread_service: ProofreadService = Depends(get_proofread_service)
):
    corrections = [
        CorrectionResult(
            rule_id=c.rule_id,
            rule_name=c.rule_name,
            category=c.category,
            original_text=c.original_text,
            suggested_text=c.suggested_text,
            position_start=c.position_start,
            position_end=c.position_end,
            explanation=c.explanation,
            severity=c.severity,
            confidence=c.confidence,
            source=c.source
        )
        for c in request.corrections
    ]
    
    try:
        corrected_text = proofread_service.apply_all_corrections(
            text=request.text,
            corrections=corrections
        )
        
        applied_count = sum(1 for c in corrections if c.suggested_text is not None)
        
        if request.document_id:
            document = db.query(Document).filter(Document.id == request.document_id).first()
            if document:
                new_version = document.current_version + 1
                db_version = DocumentVersion(
                    document_id=document.id,
                    version_number=new_version,
                    content=corrected_text,
                    change_description=f"批量应用 {applied_count} 个修正",
                    word_count=len(corrected_text)
                )
                db.add(db_version)
                document.current_content = corrected_text
                document.current_version = new_version
                db.commit()
        
        return CorrectionApplyResponse(
            original_text=request.text,
            corrected_text=corrected_text,
            applied_count=applied_count,
            success=True,
            message=f"已成功应用 {applied_count} 个修正"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量应用修正失败: {str(e)}")


@router.get("/categories")
def get_correction_categories():
    return {
        "categories": [
            {"id": "政治术语", "name": "政治术语检查", "description": "检测政治术语使用是否规范"},
            {"id": "固定搭配", "name": "固定搭配检查", "description": "检测固定搭配使用是否正确"},
            {"id": "标点符号", "name": "标点符号检查", "description": "检测标点符号使用是否规范"},
            {"id": "口语化", "name": "口语化表达检测", "description": "检测并润色口语化表达"},
            {"id": "格式", "name": "格式检查", "description": "检查红头文件格式规范"},
        ]
    }


@router.get("/statistics/{document_id}")
def get_document_statistics(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    corrections = db.query(ProofreadCorrection).filter(
        ProofreadCorrection.document_id == document_id
    ).all()
    
    suggestions = db.query(PolishSuggestion).filter(
        PolishSuggestion.document_id == document_id
    ).all()
    
    category_counts = {}
    severity_counts = {"major": 0, "warning": 0, "minor": 0, "info": 0}
    
    for correction in corrections:
        category = correction.category or "其他"
        category_counts[category] = category_counts.get(category, 0) + 1
        
        if correction.severity in severity_counts:
            severity_counts[correction.severity] += 1
    
    polish_categories = {}
    for suggestion in suggestions:
        category = suggestion.category or "其他"
        polish_categories[category] = polish_categories.get(category, 0) + 1
    
    return {
        "document_id": document_id,
        "total_corrections": len(corrections),
        "total_suggestions": len(suggestions),
        "corrections_by_category": category_counts,
        "corrections_by_severity": severity_counts,
        "suggestions_by_category": polish_categories,
        "word_count": len(document.current_content)
    }
