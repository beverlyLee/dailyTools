from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlmodel import Session
import io

from ..database import get_session
from ..models.case import Case
from ..models.document import Document, DocumentRead, GeneratedDocument
from ..services.template_service import template_service
from ..services.word_service import word_document_service


router = APIRouter(prefix="/documents", tags=["Documents"])


class TemplateGenerateRequest(BaseModel):
    template_name: str
    context: Dict[str, Any]
    case_id: Optional[int] = None
    document_name: Optional[str] = None


@router.get("/templates")
def list_templates():
    templates = template_service.list_available_templates()
    return {"templates": templates}


@router.get("/templates/{template_name}")
def get_template_info(template_name: str):
    requirements = template_service.get_template_requirements(template_name)
    if not requirements:
        raise HTTPException(status_code=404, detail=f"Template {template_name} not found")
    return requirements


@router.post("/generate", response_model=GeneratedDocument)
def generate_document(
    request: TemplateGenerateRequest,
    session: Session = Depends(get_session)
):
    try:
        request.context["current_date"] = datetime.now()
        
        content = template_service.generate_document(request.template_name, request.context)
        
        templates = template_service.list_available_templates()
        template_info = next((t for t in templates if t["template_file"] == request.template_name), None)
        
        document_name = request.document_name or (template_info["name"] if template_info else "法律文书")
        
        if request.case_id:
            case = session.get(Case, request.case_id)
            if not case:
                raise HTTPException(status_code=404, detail=f"Case with id {request.case_id} not found")
            
            document = Document(
                case_id=request.case_id,
                document_type=template_info["category"] if template_info else "other",
                document_name=document_name,
                content=content,
                created_at=datetime.utcnow()
            )
            session.add(document)
            session.commit()
            session.refresh(document)
        
        return GeneratedDocument(
            document_type=template_info["category"] if template_info else "other",
            document_name=document_name,
            content=content
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")


@router.post("/generate/word")
def generate_word_document(
    request: TemplateGenerateRequest,
    session: Session = Depends(get_session)
):
    try:
        request.context["current_date"] = datetime.now()
        
        word_bytes = word_document_service.generate_document(
            request.template_name,
            request.context
        )
        
        templates = template_service.list_available_templates()
        template_info = next((t for t in templates if t["template_file"] == request.template_name), None)
        
        document_name = request.document_name or (template_info["name"] if template_info else "法律文书")
        safe_filename = f"{document_name}.docx".replace("/", "_").replace("\\", "_")
        
        if request.case_id:
            case = session.get(Case, request.case_id)
            if case:
                text_content = template_service.generate_document(request.template_name, request.context)
                document = Document(
                    case_id=request.case_id,
                    document_type=template_info["category"] if template_info else "other",
                    document_name=document_name,
                    content=text_content,
                    created_at=datetime.utcnow()
                )
                session.add(document)
                session.commit()
        
        return StreamingResponse(
            io.BytesIO(word_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(e)}")


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: int, session: Session = Depends(get_session)):
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with id {document_id} not found")
    return document


@router.delete("/{document_id}")
def delete_document(document_id: int, session: Session = Depends(get_session)):
    document = session.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail=f"Document with id {document_id} not found")
    
    session.delete(document)
    session.commit()
    return {"message": f"Document {document_id} deleted successfully"}
