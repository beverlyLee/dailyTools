from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from pathlib import Path
import uuid
import logging

from ..services import ocr_service
from ..config import settings
from ..database import engine
from ..models import OCRRecord
from sqlmodel import Session

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/recognize")
async def recognize_document(
    file: UploadFile = File(..., description="Image file to process"),
    document_type: Optional[str] = Form(None, description="Document type (passport, id, etc.)"),
    application_id: Optional[int] = Form(None, description="Associated visa application ID")
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_ext = Path(file.filename).suffix if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = settings.UPLOAD_DIR / unique_filename
    
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        result = ocr_service.process_document(file_path, document_type)
        
        ocr_record = None
        if result.get("success"):
            with Session(engine) as session:
                ocr_record = OCRRecord(
                    application_id=application_id,
                    file_name=file.filename or unique_filename,
                    file_path=str(file_path),
                    ocr_text=result.get("text", ""),
                    extracted_fields=result.get("extracted_fields")
                )
                session.add(ocr_record)
                session.commit()
                session.refresh(ocr_record)
                
                result["record_id"] = ocr_record.id
        
        return result
        
    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.post("/recognize/text")
async def extract_fields_from_text(
    text: str = Form(..., description="Text to extract fields from"),
    document_type: Optional[str] = Form(None, description="Document type for context")
):
    try:
        extracted_fields = ocr_service.extract_general_fields(text, document_type)
        
        return {
            "success": True,
            "original_text": text,
            "extracted_fields": extracted_fields,
            "document_type": document_type
        }
        
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@router.get("/records/{record_id}")
async def get_ocr_record(record_id: int):
    with Session(engine) as session:
        record = session.get(OCRRecord, record_id)
        
        if not record:
            raise HTTPException(status_code=404, detail="OCR record not found")
        
        return {
            "id": record.id,
            "application_id": record.application_id,
            "file_name": record.file_name,
            "file_path": record.file_path,
            "ocr_text": record.ocr_text,
            "extracted_fields": record.extracted_fields,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }


@router.get("/records/application/{application_id}")
async def get_ocr_records_by_application(application_id: int):
    with Session(engine) as session:
        from sqlmodel import select
        
        statement = select(OCRRecord).where(
            OCRRecord.application_id == application_id
        ).order_by(OCRRecord.created_at.desc())
        
        records = list(session.exec(statement).all())
        
        return {
            "application_id": application_id,
            "total_records": len(records),
            "records": [
                {
                    "id": r.id,
                    "file_name": r.file_name,
                    "extracted_fields": r.extracted_fields,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in records
            ]
        }


@router.delete("/records/{record_id}")
async def delete_ocr_record(record_id: int):
    with Session(engine) as session:
        record = session.get(OCRRecord, record_id)
        
        if not record:
            raise HTTPException(status_code=404, detail="OCR record not found")
        
        try:
            file_path = Path(record.file_path)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete file: {e}")
        
        session.delete(record)
        session.commit()
        
        return {"message": "OCR record deleted successfully"}
