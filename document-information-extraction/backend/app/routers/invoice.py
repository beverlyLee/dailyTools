import os
import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.models import Invoice, TrainTicket, AirTicket
from app.services.ocr_service import ocr_service
from app.services.rules_engine import RulesEngine
from app.services.excel_service import excel_service

router = APIRouter(prefix="/api/invoice", tags=["发票管理"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class InvoiceResponse(BaseModel):
    id: int
    invoice_code: str
    invoice_number: str
    invoice_date: Optional[datetime]
    amount: float
    tax_amount: float
    total_amount: float
    seller_name: str
    buyer_name: str
    is_verified: bool
    verification_status: str
    is_reimbursed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ValidationResponse(BaseModel):
    overall_status: str
    summary: str
    validations: List[dict]

@router.post("/upload")
async def upload_and_extract(
    file: UploadFile = File(...),
    document_type: str = Form(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        file_ext = os.path.splitext(file.filename)[1]
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        extracted_data = {}
        
        if document_type == "invoice":
            extracted_data = ocr_service.analyze_document(file_path)
        elif document_type == "train":
            extracted_data = ocr_service.analyze_train_ticket(file_path)
        elif document_type == "air":
            extracted_data = ocr_service.analyze_air_ticket(file_path)
        
        return {
            "success": True,
            "document_type": document_type,
            "extracted_data": extracted_data,
            "image_path": file_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

@router.post("/save")
async def save_invoice(
    invoice_data: dict,
    document_type: str = Query(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        if document_type == "invoice":
            invoice_date = None
            if invoice_data.get("invoice_date"):
                try:
                    date_str = invoice_data.get("invoice_date", "").replace("年", "-").replace("月", "-").replace("日", "")
                    invoice_date = datetime.strptime(date_str, "%Y-%m-%d")
                except:
                    pass
            
            new_invoice = Invoice(
                invoice_code=invoice_data.get("invoice_code", ""),
                invoice_number=invoice_data.get("invoice_number", ""),
                invoice_date=invoice_date,
                amount=invoice_data.get("amount", 0.0),
                tax_amount=invoice_data.get("tax_amount", 0.0),
                total_amount=invoice_data.get("total_amount", 0.0),
                seller_name=invoice_data.get("seller_name", ""),
                seller_tax_id=invoice_data.get("seller_tax_id", ""),
                buyer_name=invoice_data.get("buyer_name", ""),
                buyer_tax_id=invoice_data.get("buyer_tax_id", ""),
                raw_ocr_data=json.dumps(invoice_data, ensure_ascii=False),
                image_path=invoice_data.get("image_path", "")
            )
            db.add(new_invoice)
            db.commit()
            db.refresh(new_invoice)
            return {"success": True, "id": new_invoice.id, "message": "发票保存成功"}
        
        elif document_type == "train":
            departure_time = None
            if invoice_data.get("departure_time"):
                try:
                    departure_time = datetime.strptime(invoice_data.get("departure_time"), "%Y-%m-%d %H:%M:%S")
                except:
                    pass
            
            new_ticket = TrainTicket(
                ticket_number=invoice_data.get("ticket_number", ""),
                departure_station=invoice_data.get("departure_station", ""),
                arrival_station=invoice_data.get("arrival_station", ""),
                departure_time=departure_time,
                train_number=invoice_data.get("train_number", ""),
                seat_class=invoice_data.get("seat_class", ""),
                price=invoice_data.get("price", 0.0),
                passenger_name=invoice_data.get("passenger_name", ""),
                id_number=invoice_data.get("id_number", ""),
                raw_ocr_data=json.dumps(invoice_data, ensure_ascii=False),
                image_path=invoice_data.get("image_path", "")
            )
            db.add(new_ticket)
            db.commit()
            db.refresh(new_ticket)
            return {"success": True, "id": new_ticket.id, "message": "火车票保存成功"}
        
        elif document_type == "air":
            departure_time = None
            if invoice_data.get("departure_time"):
                try:
                    departure_time = datetime.strptime(invoice_data.get("departure_time"), "%Y-%m-%d %H:%M:%S")
                except:
                    pass
            
            new_ticket = AirTicket(
                ticket_number=invoice_data.get("ticket_number", ""),
                departure_airport=invoice_data.get("departure_airport", ""),
                arrival_airport=invoice_data.get("arrival_airport", ""),
                departure_time=departure_time,
                flight_number=invoice_data.get("flight_number", ""),
                cabin_class=invoice_data.get("cabin_class", ""),
                price=invoice_data.get("price", 0.0),
                tax=invoice_data.get("tax", 0.0),
                total_amount=invoice_data.get("total_amount", 0.0),
                passenger_name=invoice_data.get("passenger_name", ""),
                id_number=invoice_data.get("id_number", ""),
                airline=invoice_data.get("airline", ""),
                raw_ocr_data=json.dumps(invoice_data, ensure_ascii=False),
                image_path=invoice_data.get("image_path", "")
            )
            db.add(new_ticket)
            db.commit()
            db.refresh(new_ticket)
            return {"success": True, "id": new_ticket.id, "message": "机票保存成功"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

@router.post("/validate")
async def validate_invoice(
    invoice_data: dict,
    document_type: str = Query(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        rules_engine = RulesEngine(db)
        validation_result = rules_engine.run_all_validations(invoice_data, document_type)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"校验失败: {str(e)}")

@router.get("/list", response_model=List[InvoiceResponse])
async def list_invoices(
    document_type: str = Query(default="invoice"),
    skip: int = Query(default=0),
    limit: int = Query(default=50),
    db: Session = Depends(get_db)
):
    try:
        if document_type == "invoice":
            invoices = db.query(Invoice).offset(skip).limit(limit).all()
            return invoices
        elif document_type == "train":
            tickets = db.query(TrainTicket).offset(skip).limit(limit).all()
            return [
                InvoiceResponse(
                    id=t.id,
                    invoice_code="",
                    invoice_number=t.ticket_number or "",
                    invoice_date=t.departure_time,
                    amount=t.price or 0.0,
                    tax_amount=0.0,
                    total_amount=t.price or 0.0,
                    seller_name=t.train_number or "",
                    buyer_name=t.passenger_name or "",
                    is_verified=t.is_verified,
                    verification_status=t.verification_status,
                    is_reimbursed=t.is_reimbursed,
                    created_at=t.created_at
                ) for t in tickets
            ]
        elif document_type == "air":
            tickets = db.query(AirTicket).offset(skip).limit(limit).all()
            return [
                InvoiceResponse(
                    id=t.id,
                    invoice_code="",
                    invoice_number=t.ticket_number or "",
                    invoice_date=t.departure_time,
                    amount=t.price or 0.0,
                    tax_amount=t.tax or 0.0,
                    total_amount=t.total_amount or 0.0,
                    seller_name=t.airline or "",
                    buyer_name=t.passenger_name or "",
                    is_verified=t.is_verified,
                    verification_status=t.verification_status,
                    is_reimbursed=t.is_reimbursed,
                    created_at=t.created_at
                ) for t in tickets
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")

@router.get("/export")
async def export_excel(
    document_type: str = Query(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        if document_type == "invoice":
            invoices = db.query(Invoice).all()
            excel_data = excel_service.export_invoices_to_excel(invoices)
            filename = "增值税发票报销明细.xlsx"
        elif document_type == "train":
            tickets = db.query(TrainTicket).all()
            excel_data = excel_service.export_train_tickets_to_excel(tickets)
            filename = "火车票报销明细.xlsx"
        elif document_type == "air":
            tickets = db.query(AirTicket).all()
            excel_data = excel_service.export_air_tickets_to_excel(tickets)
            filename = "机票报销明细.xlsx"
        
        return StreamingResponse(
            excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@router.put("/reimburse/{invoice_id}")
async def mark_reimbursed(
    invoice_id: int,
    document_type: str = Query(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        if document_type == "invoice":
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        elif document_type == "train":
            invoice = db.query(TrainTicket).filter(TrainTicket.id == invoice_id).first()
        elif document_type == "air":
            invoice = db.query(AirTicket).filter(AirTicket.id == invoice_id).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="票据不存在")
        
        invoice.is_reimbursed = True
        db.commit()
        
        return {"success": True, "message": "已标记为已报销"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    document_type: str = Query(default="invoice"),
    db: Session = Depends(get_db)
):
    try:
        if document_type == "invoice":
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        elif document_type == "train":
            invoice = db.query(TrainTicket).filter(TrainTicket.id == invoice_id).first()
        elif document_type == "air":
            invoice = db.query(AirTicket).filter(AirTicket.id == invoice_id).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="票据不存在")
        
        db.delete(invoice)
        db.commit()
        
        return {"success": True, "message": "删除成功"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
