from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from ..models import SessionLocal
from ..services.document_service import DocumentService

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DocumentCreate(BaseModel):
    title: str
    content: str
    document_type: str = "general"

class DocumentUpdate(BaseModel):
    content: str
    change_description: Optional[str] = None

class CorrectionSave(BaseModel):
    document_id: int
    version_id: Optional[int] = None
    original_text: str
    suggested_text: str
    correction_type: str
    category: str
    explanation: str
    start_position: int = -1
    end_position: int = -1

def document_to_dict(document):
    return {
        "id": document.id,
        "title": document.title,
        "current_content": document.current_content,
        "document_type": document.document_type,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None
    }

def version_to_dict(version):
    return {
        "id": version.id,
        "document_id": version.document_id,
        "version_number": version.version_number,
        "content": version.content,
        "change_description": version.change_description,
        "created_at": version.created_at.isoformat() if version.created_at else None
    }

def correction_to_dict(correction):
    return {
        "id": correction.id,
        "document_id": correction.document_id,
        "version_id": correction.version_id,
        "original_text": correction.original_text,
        "suggested_text": correction.suggested_text,
        "correction_type": correction.correction_type,
        "category": correction.category,
        "explanation": correction.explanation,
        "start_position": correction.start_position,
        "end_position": correction.end_position,
        "is_applied": correction.is_applied,
        "created_at": correction.created_at.isoformat() if correction.created_at else None
    }

@router.post("/", response_model=Dict[str, Any])
def create_document(doc: DocumentCreate, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.create_document(
        title=doc.title,
        content=doc.content,
        document_type=doc.document_type
    )
    return {
        "success": True,
        "data": document_to_dict(document)
    }

@router.get("/", response_model=Dict[str, Any])
def get_all_documents(db: Session = Depends(get_db)):
    service = DocumentService(db)
    documents = service.get_all_documents()
    return {
        "success": True,
        "data": {
            "documents": [document_to_dict(doc) for doc in documents],
            "total_count": len(documents)
        }
    }

@router.get("/{document_id}", response_model=Dict[str, Any])
def get_document(document_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "success": True,
        "data": document_to_dict(document)
    }

@router.put("/{document_id}", response_model=Dict[str, Any])
def update_document(document_id: int, doc: DocumentUpdate, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.update_document(
        document_id=document_id,
        content=doc.content,
        change_description=doc.change_description
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "success": True,
        "data": document_to_dict(document)
    }

@router.delete("/{document_id}", response_model=Dict[str, Any])
def delete_document(document_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    success = service.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "success": True,
        "message": "Document deleted successfully"
    }

@router.get("/{document_id}/versions", response_model=Dict[str, Any])
def get_document_versions(document_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    versions = service.get_versions(document_id)
    return {
        "success": True,
        "data": {
            "versions": [version_to_dict(v) for v in versions],
            "total_count": len(versions)
        }
    }

@router.get("/{document_id}/versions/{version_number}", response_model=Dict[str, Any])
def get_document_version(document_id: int, version_number: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    version = service.get_version(document_id, version_number)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return {
        "success": True,
        "data": version_to_dict(version)
    }

@router.post("/{document_id}/versions/{version_number}/restore", response_model=Dict[str, Any])
def restore_document_version(document_id: int, version_number: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.restore_version(document_id, version_number)
    if not document:
        raise HTTPException(status_code=404, detail="Version not found")
    return {
        "success": True,
        "message": f"Restored to version v{version_number}",
        "data": document_to_dict(document)
    }

@router.post("/corrections", response_model=Dict[str, Any])
def save_correction(correction: CorrectionSave, db: Session = Depends(get_db)):
    service = DocumentService(db)
    doc = service.get_document(correction.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    saved_correction = service.save_correction(
        document_id=correction.document_id,
        version_id=correction.version_id,
        original_text=correction.original_text,
        suggested_text=correction.suggested_text,
        correction_type=correction.correction_type,
        category=correction.category,
        explanation=correction.explanation,
        start_position=correction.start_position,
        end_position=correction.end_position
    )
    return {
        "success": True,
        "data": correction_to_dict(saved_correction)
    }

@router.get("/{document_id}/corrections", response_model=Dict[str, Any])
def get_document_corrections(document_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    document = service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    corrections = service.get_corrections(document_id)
    return {
        "success": True,
        "data": {
            "corrections": [correction_to_dict(c) for c in corrections],
            "total_count": len(corrections)
        }
    }

@router.post("/corrections/{correction_id}/apply", response_model=Dict[str, Any])
def apply_correction(correction_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    correction = service.apply_correction(correction_id)
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")
    return {
        "success": True,
        "message": "Correction applied successfully",
        "data": correction_to_dict(correction)
    }
