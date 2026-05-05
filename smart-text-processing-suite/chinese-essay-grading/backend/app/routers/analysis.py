from fastapi import APIRouter, Depends, Query
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..models import Essay, Grading, EssayError, Class, ClassMember, User

router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
def get_overall_analysis(
    db: Session = Depends(get_db)
):
    total_essays = db.query(Essay).count()
    graded_essays = db.query(Essay).filter(Essay.is_graded == 1).count()
    
    avg_scores = db.query(
        func.avg(Grading.total_score).label('avg_total'),
        func.avg(Grading.content_score).label('avg_content'),
        func.avg(Grading.language_score).label('avg_language'),
        func.avg(Grading.structure_score).label('avg_structure')
    ).filter(Grading.total_score > 0).first()
    
    error_stats = db.query(
        EssayError.error_type,
        func.count(EssayError.id).label('count')
    ).group_by(EssayError.error_type).all()
    
    error_distribution = {err.error_type: err.count for err in error_stats}
    
    class_count = db.query(Class).count()
    
    return {
        "success": True,
        "data": {
            "overview": {
                "total_essays": total_essays,
                "graded_essays": graded_essays,
                "ungraded_essays": total_essays - graded_essays,
                "total_classes": class_count
            },
            "scores": {
                "average_total": round(avg_scores.avg_total or 0, 1),
                "average_content": round(avg_scores.avg_content or 0, 1),
                "average_language": round(avg_scores.avg_language or 0, 1),
                "average_structure": round(avg_scores.avg_structure or 0, 1)
            },
            "error_distribution": error_distribution
        }
    }


@router.get("/class/{class_id}", response_model=Dict[str, Any])
def get_class_analysis(
    class_id: int,
    db: Session = Depends(get_db)
):
    class_info = db.query(Class).filter(Class.id == class_id).first()
    if not class_info:
        return {
            "success": False,
            "message": "班级不存在"
        }
    
    member_count = db.query(ClassMember).filter(ClassMember.class_id == class_id).count()
    
    essays = db.query(Essay).join(
        ClassMember,
        ClassMember.student_id == Essay.student_id
    ).filter(ClassMember.class_id == class_id).all()
    
    essay_ids = [e.id for e in essays]
    
    graded_essays = [e for e in essays if e.is_graded]
    
    if essay_ids:
        avg_scores = db.query(
            func.avg(Grading.total_score).label('avg_total'),
            func.avg(Grading.content_score).label('avg_content'),
            func.avg(Grading.language_score).label('avg_language'),
            func.avg(Grading.structure_score).label('avg_structure')
        ).filter(Grading.essay_id.in_(essay_ids), Grading.total_score > 0).first()
        
        error_stats = db.query(
            EssayError.error_type,
            func.count(EssayError.id).label('count')
        ).filter(EssayError.essay_id.in_(essay_ids)
        ).group_by(EssayError.error_type).all()
    else:
        avg_scores = None
        error_stats = []
    
    error_distribution = {err.error_type: err.count for err in error_stats}
    
    score_distribution = {
        "excellent": 0,
        "good": 0,
        "pass": 0,
        "fail": 0
    }
    
    if essay_ids:
        gradings = db.query(Grading).filter(Grading.essay_id.in_(essay_ids)).all()
        for g in gradings:
            if g.total_score >= 90:
                score_distribution["excellent"] += 1
            elif g.total_score >= 70:
                score_distribution["good"] += 1
            elif g.total_score >= 60:
                score_distribution["pass"] += 1
            else:
                score_distribution["fail"] += 1
    
    return {
        "success": True,
        "data": {
            "class_info": {
                "id": class_info.id,
                "name": class_info.name,
                "description": class_info.description,
                "grade": class_info.grade,
                "member_count": member_count
            },
            "overview": {
                "total_essays": len(essays),
                "graded_essays": len(graded_essays),
                "ungraded_essays": len(essays) - len(graded_essays)
            },
            "scores": {
                "average_total": round(avg_scores.avg_total or 0, 1) if avg_scores else 0,
                "average_content": round(avg_scores.avg_content or 0, 1) if avg_scores else 0,
                "average_language": round(avg_scores.avg_language or 0, 1) if avg_scores else 0,
                "average_structure": round(avg_scores.avg_structure or 0, 1) if avg_scores else 0,
                "distribution": score_distribution
            },
            "error_distribution": error_distribution
        }
    }


@router.get("/errors", response_model=Dict[str, Any])
def get_error_analysis(
    error_type: Optional[str] = Query(None, description="错误类型筛选"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(EssayError).join(Essay, EssayError.essay_id == Essay.id)
    
    if error_type:
        query = query.filter(EssayError.error_type == error_type)
    
    errors = query.order_by(desc(EssayError.created_at)).limit(limit).all()
    
    error_summary = db.query(
        EssayError.error_type,
        func.count(EssayError.id).label('count'),
        func.avg(EssayError.confidence).label('avg_confidence')
    ).group_by(EssayError.error_type).all()
    
    severity_stats = db.query(
        EssayError.severity,
        func.count(EssayError.id).label('count')
    ).group_by(EssayError.severity).all()
    
    severity_distribution = {s.severity: s.count for s in severity_stats}
    
    errors_list = [{
        "id": e.id,
        "essay_id": e.essay_id,
        "error_type": e.error_type,
        "original_text": e.original_text,
        "corrected_text": e.corrected_text,
        "explanation": e.explanation,
        "position_start": e.position_start,
        "position_end": e.position_end,
        "line_number": e.line_number,
        "severity": e.severity,
        "confidence": e.confidence,
        "created_at": e.created_at.isoformat() if e.created_at else None
    } for e in errors]
    
    summary_list = [{
        "error_type": s.error_type,
        "count": s.count,
        "average_confidence": round(s.avg_confidence or 0, 2)
    } for s in error_summary]
    
    return {
        "success": True,
        "data": {
            "errors": errors_list,
            "summary": summary_list,
            "severity_distribution": severity_distribution
        }
    }


@router.get("/trends", response_model=Dict[str, Any])
def get_score_trends(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    daily_stats = db.query(
        func.date(Grading.created_at).label('date'),
        func.count(Grading.id).label('count'),
        func.avg(Grading.total_score).label('avg_score')
    ).filter(
        Grading.created_at >= start_date,
        Grading.created_at <= end_date
    ).group_by(
        func.date(Grading.created_at)
    ).order_by(
        'date'
    ).all()
    
    trends = [{
        "date": str(stat.date),
        "essay_count": stat.count,
        "average_score": round(stat.avg_score or 0, 1)
    } for stat in daily_stats]
    
    overall_stats = db.query(
        func.count(Grading.id).label('total'),
        func.avg(Grading.total_score).label('avg_score'),
        func.min(Grading.total_score).label('min_score'),
        func.max(Grading.total_score).label('max_score')
    ).filter(
        Grading.created_at >= start_date,
        Grading.created_at <= end_date
    ).first()
    
    return {
        "success": True,
        "data": {
            "period": f"最近{days}天",
            "overview": {
                "total_graded": overall_stats.total or 0,
                "average_score": round(overall_stats.avg_score or 0, 1),
                "min_score": overall_stats.min_score or 0,
                "max_score": overall_stats.max_score or 0
            },
            "daily_trends": trends
        }
    }


@router.get("/classes", response_model=Dict[str, Any])
def get_all_classes_analysis(
    db: Session = Depends(get_db)
):
    classes = db.query(Class).all()
    
    class_analyses = []
    for cls in classes:
        member_count = db.query(ClassMember).filter(ClassMember.class_id == cls.id).count()
        
        essay_count = db.query(Essay).join(
            ClassMember,
            ClassMember.student_id == Essay.student_id
        ).filter(ClassMember.class_id == cls.id).count()
        
        graded_count = db.query(Essay).join(
            ClassMember,
            ClassMember.student_id == Essay.student_id
        ).filter(
            ClassMember.class_id == cls.id,
            Essay.is_graded == 1
        ).count()
        
        essay_ids = db.query(Essay.id).join(
            ClassMember,
            ClassMember.student_id == Essay.student_id
        ).filter(ClassMember.class_id == cls.id).all()
        essay_ids = [e[0] for e in essay_ids]
        
        if essay_ids:
            avg_score = db.query(func.avg(Grading.total_score)
            ).filter(Grading.essay_id.in_(essay_ids)).scalar()
        else:
            avg_score = None
        
        class_analyses.append({
            "id": cls.id,
            "name": cls.name,
            "grade": cls.grade,
            "description": cls.description,
            "member_count": member_count,
            "total_essays": essay_count,
            "graded_essays": graded_count,
            "average_score": round(avg_score or 0, 1)
        })
    
    return {
        "success": True,
        "data": {
            "total_classes": len(class_analyses),
            "classes": class_analyses
        }
    }
