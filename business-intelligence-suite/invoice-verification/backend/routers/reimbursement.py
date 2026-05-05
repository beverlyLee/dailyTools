from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from database import get_db, Invoice, ReimbursementBatch
from models import (
    ReimbursementBatchCreate, ReimbursementBatchResponse,
    InvoiceResponse, PaginatedResponse
)
from services.export_service import generate_batch_number

router = APIRouter(prefix="/reimbursement", tags=["报销管理"])

@router.post("/create-batch", response_model=ReimbursementBatchResponse)
async def create_reimbursement_batch(
    batch_data: ReimbursementBatchCreate,
    db: AsyncSession = Depends(get_db)
):
    if not batch_data.invoice_ids:
        raise HTTPException(status_code=400, detail="请选择要报销的发票")
    
    query = select(Invoice).where(
        and_(
            Invoice.id.in_(batch_data.invoice_ids),
            Invoice.is_reimbursed == False
        )
    )
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    if not invoices:
        raise HTTPException(status_code=400, detail="所选发票不存在或已报销")
    
    valid_ids = [inv.id for inv in invoices]
    invalid_ids = [id for id in batch_data.invoice_ids if id not in valid_ids]
    if invalid_ids:
        raise HTTPException(status_code=400, detail=f"发票 {invalid_ids} 不存在或已报销")
    
    batch_number = generate_batch_number()
    
    total_amount = sum(
        float(inv.total_amount_with_tax) if inv.total_amount_with_tax else 0
        for inv in invoices
    )
    
    batch = ReimbursementBatch(
        batch_number=batch_number,
        description=batch_data.description,
        total_amount=Decimal(str(total_amount)),
        invoice_count=len(invoices),
        status="pending",
        created_by=batch_data.created_by
    )
    
    db.add(batch)
    await db.flush()
    
    for invoice in invoices:
        invoice.is_reimbursed = True
        invoice.reimbursed_at = datetime.now()
        invoice.reimbursed_by = batch_data.created_by
    
    await db.commit()
    await db.refresh(batch)
    
    return ReimbursementBatchResponse(**batch.to_dict())

@router.get("/batches", response_model=PaginatedResponse)
async def list_reimbursement_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    created_by: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    count_query = select(func.count(ReimbursementBatch.id))
    query = select(ReimbursementBatch)
    
    if status:
        count_query = count_query.where(ReimbursementBatch.status == status)
        query = query.where(ReimbursementBatch.status == status)
    
    if created_by:
        count_query = count_query.where(ReimbursementBatch.created_by.contains(created_by))
        query = query.where(ReimbursementBatch.created_by.contains(created_by))
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    query = query.order_by(desc(ReimbursementBatch.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    batches = result.scalars().all()
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[b.to_dict() for b in batches]
    )

@router.get("/batches/{batch_id}", response_model=ReimbursementBatchResponse)
async def get_reimbursement_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(ReimbursementBatch).where(ReimbursementBatch.id == batch_id)
    result = await db.execute(query)
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(status_code=404, detail="报销批次不存在")
    
    return ReimbursementBatchResponse(**batch.to_dict())

@router.put("/batches/{batch_id}/approve")
async def approve_reimbursement_batch(
    batch_id: int,
    approved_by: str = Query(..., description="审批人"),
    db: AsyncSession = Depends(get_db)
):
    query = select(ReimbursementBatch).where(ReimbursementBatch.id == batch_id)
    result = await db.execute(query)
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(status_code=404, detail="报销批次不存在")
    
    if batch.status != "pending":
        raise HTTPException(status_code=400, detail=f"批次状态为 {batch.status}，无法审批")
    
    batch.status = "approved"
    batch.approved_by = approved_by
    batch.approved_at = datetime.now()
    
    await db.commit()
    await db.refresh(batch)
    
    return {
        "message": "审批通过",
        "batch_id": batch.id,
        "status": batch.status
    }

@router.put("/batches/{batch_id}/reject")
async def reject_reimbursement_batch(
    batch_id: int,
    reason: str = Query(..., description="拒绝原因"),
    db: AsyncSession = Depends(get_db)
):
    query = select(ReimbursementBatch).where(ReimbursementBatch.id == batch_id)
    result = await db.execute(query)
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(status_code=404, detail="报销批次不存在")
    
    if batch.status != "pending":
        raise HTTPException(status_code=400, detail=f"批次状态为 {batch.status}，无法拒绝")
    
    batch.status = "rejected"
    
    await db.commit()
    
    return {
        "message": "已拒绝",
        "batch_id": batch.id,
        "status": batch.status,
        "reason": reason
    }

@router.get("/status-options")
async def get_reimbursement_status_options():
    return {
        "statuses": [
            {"code": "pending", "name": "待审批"},
            {"code": "approved", "name": "已批准"},
            {"code": "rejected", "name": "已拒绝"},
            {"code": "paid", "name": "已付款"}
        ]
    }

@router.post("/mark-reimbursed/{invoice_id}")
async def mark_invoice_reimbursed(
    invoice_id: int,
    reimbursed_by: Optional[str] = Query(None, description="报销人"),
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(query)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    if invoice.is_reimbursed:
        raise HTTPException(status_code=400, detail="发票已报销")
    
    invoice.is_reimbursed = True
    invoice.reimbursed_at = datetime.now()
    invoice.reimbursed_by = reimbursed_by
    
    await db.commit()
    
    return {
        "message": "标记成功",
        "invoice_id": invoice.id,
        "is_reimbursed": True
    }

@router.post("/unmark-reimbursed/{invoice_id}")
async def unmark_invoice_reimbursed(
    invoice_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(query)
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    if not invoice.is_reimbursed:
        raise HTTPException(status_code=400, detail="发票未报销")
    
    invoice.is_reimbursed = False
    invoice.reimbursed_at = None
    invoice.reimbursed_by = None
    
    await db.commit()
    
    return {
        "message": "取消报销标记成功",
        "invoice_id": invoice.id,
        "is_reimbursed": False
    }
