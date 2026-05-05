from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.utils.database import get_sqlite_session
from app.models.document import Document, DocumentVersion, DocumentIssue
from app.services.document_service import DocumentService


router = APIRouter(prefix="/document", tags=["公文校对"])


class DocumentCheckRequest(BaseModel):
    content: str
    docType: Optional[str] = "notice"
    docNumber: Optional[str] = ""
    checkLevel: Optional[str] = "standard"


class DocumentSaveRequest(BaseModel):
    title: str
    content: str
    docType: Optional[str] = "notice"
    docNumber: Optional[str] = ""
    changeSummary: Optional[str] = ""


class DocumentIssueDetail(BaseModel):
    category: str
    severity: str
    original: str
    suggestion: Optional[str] = None
    explanation: Optional[str] = None
    range: Optional[dict] = None


class FormatIssue(BaseModel):
    type: str
    description: str
    suggestion: Optional[str] = None
    severity: str = "warning"


class PolishSuggestion(BaseModel):
    original: str
    suggestion: str
    explanation: Optional[str] = None
    category: str


class DocumentCheckResponse(BaseModel):
    issues: List[DocumentIssueDetail]
    formatIssues: List[FormatIssue]
    polishSuggestions: List[PolishSuggestion]
    statistics: dict


@router.post("/check")
async def check_document(
    request: DocumentCheckRequest
):
    try:
        service = DocumentService()
        
        result = await service.check_document(
            content=request.content,
            doc_type=request.docType,
            doc_number=request.docNumber,
            check_level=request.checkLevel
        )
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_document(
    request: DocumentSaveRequest,
    session: AsyncSession = Depends(get_sqlite_session)
):
    try:
        document_id = str(uuid.uuid4())
        
        document = Document(
            document_id=document_id,
            title=request.title,
            doc_type=request.docType,
            doc_number=request.docNumber,
            current_version=1,
            total_versions=1
        )
        session.add(document)
        await session.flush()
        
        version = DocumentVersion(
            document_id=document.id,
            version=1,
            title=request.title,
            content=request.content,
            word_count=len(request.content.replace(" ", "").replace("\n", "")),
            change_summary=request.changeSummary
        )
        session.add(version)
        
        await session.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "documentId": document_id,
                "version": 1,
                "message": "保存成功"
            }
        )
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/versions")
async def get_document_versions(
    document_id: str,
    session: AsyncSession = Depends(get_sqlite_session)
):
    try:
        result = await session.execute(
            select(Document).where(Document.document_id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        versions_result = await session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document.id)
            .order_by(desc(DocumentVersion.version))
        )
        versions = versions_result.scalars().all()
        
        version_list = []
        for version in versions:
            version_list.append({
                "version": version.version,
                "title": version.title,
                "wordCount": version.word_count,
                "changeSummary": version.change_summary,
                "createdAt": version.created_at.strftime("%Y-%m-%d %H:%M:%S") if version.created_at else None,
                "content": version.content
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "documentId": document_id,
                "currentVersion": document.current_version,
                "totalVersions": document.total_versions,
                "versions": version_list
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/version/{version}")
async def get_document_version(
    document_id: str,
    version: int,
    session: AsyncSession = Depends(get_sqlite_session)
):
    try:
        doc_result = await session.execute(
            select(Document).where(Document.document_id == document_id)
        )
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        version_result = await session.execute(
            select(DocumentVersion)
            .where(
                DocumentVersion.document_id == document.id,
                DocumentVersion.version == version
            )
        )
        doc_version = version_result.scalar_one_or_none()
        
        if not doc_version:
            raise HTTPException(status_code=404, detail="版本不存在")
        
        return JSONResponse(
            status_code=200,
            content={
                "documentId": document_id,
                "version": version,
                "title": doc_version.title,
                "content": doc_version.content,
                "wordCount": doc_version.word_count,
                "checkResult": doc_version.check_result,
                "formatCheckResult": doc_version.format_check_result,
                "polishSuggestions": doc_version.polish_suggestions,
                "createdAt": doc_version.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc_version.created_at else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{document_id}/new-version")
async def create_new_version(
    document_id: str,
    request: DocumentSaveRequest,
    session: AsyncSession = Depends(get_sqlite_session)
):
    try:
        result = await session.execute(
            select(Document).where(Document.document_id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="文档不存在")
        
        new_version = document.current_version + 1
        
        version = DocumentVersion(
            document_id=document.id,
            version=new_version,
            title=request.title,
            content=request.content,
            word_count=len(request.content.replace(" ", "").replace("\n", "")),
            change_summary=request.changeSummary
        )
        session.add(version)
        
        document.current_version = new_version
        document.total_versions = new_version
        document.title = request.title
        document.doc_number = request.docNumber
        
        await session.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "documentId": document_id,
                "version": new_version,
                "message": "新版本创建成功"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def get_document_list(
    page: int = 1,
    page_size: int = 10,
    doc_type: Optional[str] = None,
    session: AsyncSession = Depends(get_sqlite_session)
):
    try:
        query = select(Document).order_by(desc(Document.updated_at))
        
        if doc_type:
            query = query.where(Document.doc_type == doc_type)
        
        result = await session.execute(query)
        documents = result.scalars().all()
        
        total = len(documents)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_docs = documents[start:end]
        
        doc_list = []
        for doc in paginated_docs:
            doc_list.append({
                "documentId": doc.document_id,
                "title": doc.title,
                "docType": doc.doc_type,
                "docNumber": doc.doc_number,
                "currentVersion": doc.current_version,
                "totalVersions": doc.total_versions,
                "createdAt": doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else None,
                "updatedAt": doc.updated_at.strftime("%Y-%m-%d %H:%M:%S") if doc.updated_at else None
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "total": total,
                "page": page,
                "pageSize": page_size,
                "list": doc_list
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
