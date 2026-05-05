import os
import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from config import settings
from database import get_db, Invoice, InvoiceItem, Company, VerificationRecord, ReimbursementBatch
from models import (
    InvoiceCreate, InvoiceResponse, InvoiceItemResponse,
    VerificationResult, OCRResult, PaginatedResponse,
    UploadResponse, VerificationRecordResponse
)
from services.ocr_service import ocr_engine
from services.verification_service import verification_engine, VerificationRule
from services.export_service import export_invoices_to_excel, generate_batch_number

router = APIRouter(prefix="/invoice", tags=["发票管理"])

async def save_upload_file(file: UploadFile) -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    return file_path

def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    
    formats = [
        "%Y-%m-%d",
        "%Y年%m月%d日",
        "%Y/%m/%d",
        "%Y%m%d"
    ]
    
    for fmt in formats:
        try:
            date_str_clean = date_str.replace("年", "-").replace("月", "-").replace("日", "")
            return datetime.strptime(date_str_clean, "%Y-%m-%d")
        except:
            continue
    
    return None

def parse_decimal(value: Optional[str]) -> Optional[Decimal]:
    if not value:
        return None
    
    try:
        value_clean = str(value).replace(",", "").replace(" ", "")
        return Decimal(value_clean)
    except:
        return None

@router.post("/upload", response_model=UploadResponse)
async def upload_invoice(
    file: UploadFile = File(...),
    auto_verify: bool = Query(True, description="是否自动核验"),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    try:
        file_path = await save_upload_file(file)
        
        ocr_result_data = await ocr_engine.recognize(file_path)
        extracted_fields = ocr_engine.extract_fields(ocr_result_data)
        
        ocr_result = OCRResult(
            invoice_type=extracted_fields.get("invoice_type", "unknown"),
            confidence=ocr_result_data.get("confidence", 0.8),
            raw_text=ocr_result_data.get("all_text", ""),
            extracted_fields=extracted_fields,
            ocr_engine=ocr_result_data.get("engine", "unknown"),
            processing_time=0.0
        )
        
        invoice = Invoice(
            invoice_type=extracted_fields.get("invoice_type", "vat_invoice"),
            invoice_code=extracted_fields.get("invoice_code"),
            invoice_number=extracted_fields.get("invoice_number"),
            invoice_date=parse_date(extracted_fields.get("invoice_date")),
            check_code=extracted_fields.get("check_code"),
            
            seller_name=extracted_fields.get("seller_name"),
            seller_tax_id=extracted_fields.get("seller_tax_id"),
            seller_address=extracted_fields.get("seller_address"),
            seller_bank=extracted_fields.get("seller_bank"),
            
            buyer_name=extracted_fields.get("buyer_name"),
            buyer_tax_id=extracted_fields.get("buyer_tax_id"),
            buyer_address=extracted_fields.get("buyer_address"),
            buyer_bank=extracted_fields.get("buyer_bank"),
            
            total_amount=parse_decimal(extracted_fields.get("total_amount")),
            total_tax=parse_decimal(extracted_fields.get("total_tax")),
            total_amount_with_tax=parse_decimal(extracted_fields.get("total_amount_with_tax")),
            
            image_path=file_path,
            raw_ocr_data=json.dumps(extracted_fields, ensure_ascii=False)
        )
        
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)
        
        if auto_verify:
            is_passed, rules = await verification_engine.verify(invoice, db)
            
            for rule in rules:
                record = VerificationRecord(
                    invoice_id=invoice.id,
                    check_type=rule.rule_type,
                    check_name=rule.rule_name,
                    is_passed=rule.is_passed,
                    message=rule.message,
                    details=json.dumps(rule.details, ensure_ascii=False) if rule.details else None
                )
                db.add(record)
            
            invoice.is_verified = True
            invoice.verification_status = "passed" if is_passed else "failed"
            invoice.verification_message = f"核验完成: 通过{sum(1 for r in rules if r.is_passed)}/{len(rules)}项"
            invoice.verified_at = datetime.now()
            
            await db.commit()
        
        return UploadResponse(
            success=True,
            message="发票上传并识别成功",
            invoice_id=invoice.id,
            ocr_result=ocr_result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    invoice = Invoice(
        invoice_type=invoice_data.invoice_type,
        invoice_code=invoice_data.invoice_code,
        invoice_number=invoice_data.invoice_number,
        invoice_date=invoice_data.invoice_date,
        check_code=invoice_data.check_code,
        machine_number=invoice_data.machine_number,
        
        seller_name=invoice_data.seller_name,
        seller_tax_id=invoice_data.seller_tax_id,
        seller_address=invoice_data.seller_address,
        seller_bank=invoice_data.seller_bank,
        
        buyer_name=invoice_data.buyer_name,
        buyer_tax_id=invoice_data.buyer_tax_id,
        buyer_address=invoice_data.buyer_address,
        buyer_bank=invoice_data.buyer_bank,
        
        total_amount=invoice_data.total_amount,
        total_tax=invoice_data.total_tax,
        total_amount_with_tax=invoice_data.total_amount_with_tax,
        
        remarks=invoice_data.remarks,
        payee=invoice_data.payee,
        reviewer=invoice_data.reviewer,
        drawer=invoice_data.drawer,
        seller_seal=invoice_data.seller_seal
    )
    
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    
    if invoice_data.items:
        for idx, item_data in enumerate(invoice_data.items, 1):
            item = InvoiceItem(
                invoice_id=invoice.id,
                item_number=item_data.item_number or idx,
                item_name=item_data.item_name,
                specification=item_data.specification,
                unit=item_data.unit,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                amount=item_data.amount,
                tax_rate=item_data.tax_rate,
                tax_amount=item_data.tax_amount
            )
            db.add(item)
        
        await db.commit()
    
    return InvoiceResponse(**invoice.to_dict())

@router.get("/", response_model=PaginatedResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    invoice_type: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_reimbursed: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    count_query = select(func.count(Invoice.id))
    query = select(Invoice).options(selectinload(Invoice.items))
    
    if invoice_type:
        count_query = count_query.where(Invoice.invoice_type == invoice_type)
        query = query.where(Invoice.invoice_type == invoice_type)
    
    if is_verified is not None:
        count_query = count_query.where(Invoice.is_verified == is_verified)
        query = query.where(Invoice.is_verified == is_verified)
    
    if is_reimbursed is not None:
        count_query = count_query.where(Invoice.is_reimbursed == is_reimbursed)
        query = query.where(Invoice.is_reimbursed == is_reimbursed)
    
    if keyword:
        keyword_filter = or_(
            Invoice.invoice_code.contains(keyword),
            Invoice.invoice_number.contains(keyword),
            Invoice.seller_name.contains(keyword),
            Invoice.buyer_name.contains(keyword)
        )
        count_query = count_query.where(keyword_filter)
        query = query.where(keyword_filter)
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    query = query.order_by(desc(Invoice.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    invoices = result.scalars().unique().all()
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[inv.to_dict() for inv in invoices]
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).options(
        selectinload(Invoice.items),
        selectinload(Invoice.verification_records)
    ).where(Invoice.id == invoice_id)
    
    result = await db.execute(query)
    invoice = result.scalars().unique().first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    return InvoiceResponse(**invoice.to_dict())

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(query)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    for key, value in invoice_data.model_dump(exclude_unset=True, exclude={"items"}).items():
        setattr(invoice, key, value)
    
    await db.commit()
    await db.refresh(invoice)
    
    return InvoiceResponse(**invoice.to_dict())

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(query)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    if invoice.is_reimbursed:
        raise HTTPException(status_code=400, detail="已报销的发票不能删除")
    
    await db.delete(invoice)
    await db.commit()
    
    return {"message": "删除成功"}

@router.post("/{invoice_id}/verify", response_model=VerificationResult)
async def verify_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(query)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    is_passed, rules = await verification_engine.verify(invoice, db)
    
    from sqlalchemy import delete
    await db.execute(delete(VerificationRecord).where(VerificationRecord.invoice_id == invoice_id))
    
    check_responses = []
    for rule in rules:
        record = VerificationRecord(
            invoice_id=invoice.id,
            check_type=rule.rule_type,
            check_name=rule.rule_name,
            is_passed=rule.is_passed,
            message=rule.message,
            details=json.dumps(rule.details, ensure_ascii=False) if rule.details else None
        )
        db.add(record)
        
        check_responses.append(VerificationRecordResponse(
            id=0,
            invoice_id=invoice.id,
            check_type=rule.rule_type,
            check_name=rule.rule_name,
            is_passed=rule.is_passed,
            message=rule.message,
            details=json.dumps(rule.details) if rule.details else None,
            created_at=None
        ))
    
    invoice.is_verified = True
    invoice.verification_status = "passed" if is_passed else "failed"
    invoice.verification_message = f"核验完成: 通过{sum(1 for r in rules if r.is_passed)}/{len(rules)}项"
    invoice.verified_at = datetime.now()
    
    await db.commit()
    
    return VerificationResult(
        invoice_id=invoice.id,
        overall_status="passed" if is_passed else "failed",
        total_checks=len(rules),
        passed_checks=sum(1 for r in rules if r.is_passed),
        failed_checks=sum(1 for r in rules if not r.is_passed),
        warning_checks=0,
        checks=check_responses,
        message=invoice.verification_message
    )

@router.get("/{invoice_id}/verifications", response_model=List[VerificationRecordResponse])
async def get_invoice_verifications(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(VerificationRecord).where(
        VerificationRecord.invoice_id == invoice_id
    ).order_by(VerificationRecord.created_at)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    return [VerificationRecordResponse(**r.to_dict()) for r in records]

@router.post("/export")
async def export_invoices(
    invoice_ids: List[int],
    include_items: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    if not invoice_ids:
        raise HTTPException(status_code=400, detail="请选择要导出的发票")
    
    query = select(Invoice).options(
        selectinload(Invoice.items)
    ).where(Invoice.id.in_(invoice_ids)).order_by(Invoice.created_at)
    
    result = await db.execute(query)
    invoices = result.scalars().unique().all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="未找到指定的发票")
    
    excel_data = await export_invoices_to_excel(invoices, include_items)
    
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=invoices_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        }
    )

@router.post("/export-all")
async def export_all_invoices(
    invoice_type: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_reimbursed: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None),
    include_items: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).options(
        selectinload(Invoice.items)
    )
    
    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)
    
    if is_verified is not None:
        query = query.where(Invoice.is_verified == is_verified)
    
    if is_reimbursed is not None:
        query = query.where(Invoice.is_reimbursed == is_reimbursed)
    
    if keyword:
        query = query.where(or_(
            Invoice.invoice_code.contains(keyword),
            Invoice.invoice_number.contains(keyword),
            Invoice.seller_name.contains(keyword),
            Invoice.buyer_name.contains(keyword)
        ))
    
    query = query.order_by(Invoice.created_at)
    
    result = await db.execute(query)
    invoices = result.scalars().unique().all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="没有可导出的发票")
    
    excel_data = await export_invoices_to_excel(invoices, include_items)
    
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=all_invoices_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        }
    )

@router.get("/types")
async def get_invoice_types():
    return {
        "types": [
            {"code": "vat_invoice", "name": "增值税发票"},
            {"code": "train_ticket", "name": "火车票"},
            {"code": "flight_ticket", "name": "机票"},
            {"code": "receipt", "name": "其他票据"}
        ]
    }

@router.get("/stats")
async def get_invoice_stats(db: AsyncSession = Depends(get_db)):
    total_query = select(func.count(Invoice.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar()
    
    verified_query = select(func.count(Invoice.id)).where(Invoice.is_verified == True)
    verified_result = await db.execute(verified_query)
    verified = verified_result.scalar()
    
    reimbursed_query = select(func.count(Invoice.id)).where(Invoice.is_reimbursed == True)
    reimbursed_result = await db.execute(reimbursed_query)
    reimbursed = reimbursed_result.scalar()
    
    from sqlalchemy import func
    amount_query = select(
        func.coalesce(func.sum(Invoice.total_amount_with_tax), 0)
    )
    amount_result = await db.execute(amount_query)
    total_amount = amount_result.scalar()
    
    return {
        "total_invoices": total,
        "verified": verified,
        "not_verified": total - verified,
        "reimbursed": reimbursed,
        "not_reimbursed": total - reimbursed,
        "total_amount": float(total_amount) if total_amount else 0
    }
