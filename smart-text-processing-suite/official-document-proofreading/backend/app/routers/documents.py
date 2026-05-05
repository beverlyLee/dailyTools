from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..models import Document, DocumentVersion, DocumentStatus, DocumentType
from ..schemas import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentVersionResponse,
    DocumentListResponse
)

router = APIRouter(prefix="/api/documents", tags=["文档管理"])


@router.post("", response_model=DocumentResponse)
def create_document(
    document: DocumentCreate,
    db: Session = Depends(get_db)
):
    word_count = len(document.content)
    
    db_document = Document(
        title=document.title,
        current_content=document.content,
        document_type=document.document_type or DocumentType.GENERAL.value,
        status=DocumentStatus.DRAFT.value,
        red_head_type=document.red_head_type,
        document_number=document.document_number,
        current_version=1
    )
    db.add(db_document)
    db.flush()
    
    db_version = DocumentVersion(
        document_id=db_document.id,
        version_number=1,
        content=document.content,
        change_description="初始版本",
        word_count=word_count
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_document)
    
    return DocumentResponse(
        id=db_document.id,
        title=db_document.title,
        content=db_document.current_content,
        document_type=db_document.document_type,
        status=db_document.status,
        red_head_type=db_document.red_head_type,
        document_number=db_document.document_number,
        current_version=db_document.current_version,
        created_at=db_document.created_at,
        updated_at=db_document.updated_at,
        word_count=word_count
    )


@router.get("", response_model=DocumentListResponse)
def get_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    
    if status:
        query = query.filter(Document.status == status)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if keyword:
        query = query.filter(
            Document.title.contains(keyword) |
            Document.current_content.contains(keyword)
        )
    
    total = query.count()
    
    offset = (page - 1) * page_size
    documents = query.order_by(Document.updated_at.desc()).offset(offset).limit(page_size).all()
    
    return DocumentListResponse(
        items=[
            DocumentResponse(
                id=d.id,
                title=d.title,
                content=d.current_content,
                document_type=d.document_type,
                status=d.status,
                red_head_type=d.red_head_type,
                document_number=d.document_number,
                current_version=d.current_version,
                created_at=d.created_at,
                updated_at=d.updated_at,
                word_count=len(d.current_content)
            )
            for d in documents
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.current_content,
        document_type=document.document_type,
        status=document.status,
        red_head_type=document.red_head_type,
        document_number=document.document_number,
        current_version=document.current_version,
        created_at=document.created_at,
        updated_at=document.updated_at,
        word_count=len(document.current_content)
    )


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    new_version = document.current_version + 1
    word_count = 0
    
    if document_update.content is not None:
        word_count = len(document_update.content)
        
        db_version = DocumentVersion(
            document_id=document.id,
            version_number=new_version,
            content=document_update.content,
            change_description=document_update.change_description or "更新文档内容",
            word_count=word_count
        )
        db.add(db_version)
        
        document.current_content = document_update.content
        document.current_version = new_version
    
    if document_update.title is not None:
        document.title = document_update.title
    if document_update.document_type is not None:
        document.document_type = document_update.document_type
    if document_update.status is not None:
        document.status = document_update.status
    if document_update.red_head_type is not None:
        document.red_head_type = document_update.red_head_type
    if document_update.document_number is not None:
        document.document_number = document_update.document_number
    
    db.commit()
    db.refresh(document)
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.current_content,
        document_type=document.document_type,
        status=document.status,
        red_head_type=document.red_head_type,
        document_number=document.document_number,
        current_version=document.current_version,
        created_at=document.created_at,
        updated_at=document.updated_at,
        word_count=word_count or len(document.current_content)
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    db.delete(document)
    db.commit()
    
    return {"message": "文档已删除", "document_id": document_id}


@router.get("/{document_id}/versions", response_model=List[DocumentVersionResponse])
def get_document_versions(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).all()
    
    return [
        DocumentVersionResponse(
            id=v.id,
            document_id=v.document_id,
            version_number=v.version_number,
            content=v.content,
            change_description=v.change_description,
            word_count=v.word_count,
            created_at=v.created_at
        )
        for v in versions
    ]


@router.get("/{document_id}/versions/{version_number}", response_model=DocumentVersionResponse)
def get_document_version(
    document_id: int,
    version_number: int,
    db: Session = Depends(get_db)
):
    version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == version_number
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    
    return DocumentVersionResponse(
        id=version.id,
        document_id=version.document_id,
        version_number=version.version_number,
        content=version.content,
        change_description=version.change_description,
        word_count=version.word_count,
        created_at=version.created_at
    )


@router.post("/{document_id}/revert/{version_number}", response_model=DocumentResponse)
def revert_to_version(
    document_id: int,
    version_number: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    target_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version_number == version_number
    ).first()
    
    if not target_version:
        raise HTTPException(status_code=404, detail="目标版本不存在")
    
    new_version = document.current_version + 1
    
    db_new_version = DocumentVersion(
        document_id=document.id,
        version_number=new_version,
        content=target_version.content,
        change_description=f"回退到版本 {version_number}",
        word_count=target_version.word_count
    )
    db.add(db_new_version)
    
    document.current_content = target_version.content
    document.current_version = new_version
    
    db.commit()
    db.refresh(document)
    
    return DocumentResponse(
        id=document.id,
        title=document.title,
        content=document.current_content,
        document_type=document.document_type,
        status=document.status,
        red_head_type=document.red_head_type,
        document_number=document.document_number,
        current_version=document.current_version,
        created_at=document.created_at,
        updated_at=document.updated_at,
        word_count=len(document.current_content)
    )
