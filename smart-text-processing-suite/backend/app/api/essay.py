from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.utils.database import get_mysql_session
from app.models.essay import Essay, EssayIssue, StudentAnalysis, ClassAnalysis
from app.services.essay_service import EssayService


router = APIRouter(prefix="/essay", tags=["作文批改"])


class EssayCheckRequest(BaseModel):
    title: str
    content: str
    grade: Optional[str] = "middle"
    wordCount: Optional[int] = 800
    student_id: Optional[int] = None
    class_id: Optional[int] = None


class IssueDetail(BaseModel):
    type: str
    severity: str
    original: str
    suggestion: Optional[str] = None
    explanation: Optional[str] = None
    range: Optional[dict] = None


class EssayCheckResponse(BaseModel):
    totalScore: int
    scores: dict
    issues: List[IssueDetail]
    comment: str
    suggestions: List[str]


@router.post("/check")
async def check_essay(
    request: EssayCheckRequest,
    session: AsyncSession = Depends(get_mysql_session)
):
    try:
        service = EssayService()
        
        result = await service.analyze_essay(
            content=request.content,
            title=request.title,
            grade=request.grade,
            word_count=request.wordCount
        )
        
        essay = Essay(
            title=request.title,
            content=request.content,
            grade=request.grade,
            word_count=request.wordCount,
            actual_word_count=len(request.content.replace(" ", "").replace("\n", "")),
            total_score=result["totalScore"],
            content_score=result["scores"]["content"],
            language_score=result["scores"]["language"],
            structure_score=result["scores"]["structure"],
            comment=result["comment"],
            analysis_result=result,
            student_id=request.student_id,
            class_id=request.class_id
        )
        session.add(essay)
        await session.flush()
        
        for issue_data in result["issues"]:
            issue = EssayIssue(
                essay_id=essay.id,
                issue_type=issue_data["type"],
                severity=issue_data["severity"],
                original_text=issue_data["original"],
                suggestion_text=issue_data.get("suggestion"),
                explanation=issue_data.get("explanation"),
                start_line=issue_data.get("range", {}).get("startLineNumber"),
                start_col=issue_data.get("range", {}).get("startColumn"),
                end_line=issue_data.get("range", {}).get("endLineNumber"),
                end_col=issue_data.get("range", {}).get("endColumn")
            )
            session.add(issue)
        
        await session.commit()
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_essay_history(
    page: int = 1,
    page_size: int = 10,
    student_id: Optional[int] = None,
    class_id: Optional[int] = None,
    grade: Optional[str] = None,
    session: AsyncSession = Depends(get_mysql_session)
):
    try:
        query = select(Essay).order_by(desc(Essay.created_at))
        
        if student_id:
            query = query.where(Essay.student_id == student_id)
        if class_id:
            query = query.where(Essay.class_id == class_id)
        if grade:
            query = query.where(Essay.grade == grade)
        
        result = await session.execute(query)
        essays = result.scalars().all()
        
        total = len(essays)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_essays = essays[start:end]
        
        essay_list = []
        for essay in paginated_essays:
            essay_list.append({
                "id": essay.id,
                "title": essay.title,
                "totalScore": essay.total_score,
                "contentScore": essay.content_score,
                "languageScore": essay.language_score,
                "structureScore": essay.structure_score,
                "grade": essay.grade,
                "wordCount": essay.actual_word_count,
                "createdAt": essay.created_at.strftime("%Y-%m-%d %H:%M:%S") if essay.created_at else None
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "total": total,
                "page": page,
                "pageSize": page_size,
                "list": essay_list
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{essay_id}")
async def get_essay_detail(
    essay_id: int,
    session: AsyncSession = Depends(get_mysql_session)
):
    try:
        result = await session.execute(
            select(Essay).where(Essay.id == essay_id)
        )
        essay = result.scalar_one_or_none()
        
        if not essay:
            raise HTTPException(status_code=404, detail="作文不存在")
        
        issues_result = await session.execute(
            select(EssayIssue).where(EssayIssue.essay_id == essay_id)
        )
        issues = issues_result.scalars().all()
        
        issue_list = []
        for issue in issues:
            issue_list.append({
                "type": issue.issue_type,
                "severity": issue.severity,
                "original": issue.original_text,
                "suggestion": issue.suggestion_text,
                "explanation": issue.explanation,
                "range": {
                    "startLineNumber": issue.start_line,
                    "startColumn": issue.start_col,
                    "endLineNumber": issue.end_line,
                    "endColumn": issue.end_col
                } if issue.start_line else None
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "id": essay.id,
                "title": essay.title,
                "content": essay.content,
                "grade": essay.grade,
                "totalScore": essay.total_score,
                "scores": {
                    "content": essay.content_score,
                    "language": essay.language_score,
                    "structure": essay.structure_score
                },
                "issues": issue_list,
                "comment": essay.comment,
                "createdAt": essay.created_at.strftime("%Y-%m-%d %H:%M:%S") if essay.created_at else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{essay_id}")
async def delete_essay(
    essay_id: int,
    session: AsyncSession = Depends(get_mysql_session)
):
    try:
        result = await session.execute(
            select(Essay).where(Essay.id == essay_id)
        )
        essay = result.scalar_one_or_none()
        
        if not essay:
            raise HTTPException(status_code=404, detail="作文不存在")
        
        await session.delete(essay)
        await session.commit()
        
        return JSONResponse(
            status_code=200,
            content={"message": "删除成功"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
