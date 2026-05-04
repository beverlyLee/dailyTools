from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import io
import chardet

from ..database import get_db
from ..models.bill import Bill, BillType, BillSource
from ..schemas.bill import (
    BillResponse,
    BillListResponse,
    BillStatsResponse,
    BillUpdate,
    UploadResult,
    OCRResult,
)
from ..parsers import (
    parse_bill_content,
    detect_bill_source,
    BillData,
)
from ..ml import classify_text, classify_texts

router = APIRouter(prefix="/api/bills", tags=["bills"])


@router.get("", response_model=BillListResponse)
def get_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Bill)
    
    if category:
        query = query.filter(Bill.category == category)
    
    if start_date:
        query = query.filter(Bill.date >= start_date)
    
    if end_date:
        query = query.filter(Bill.date <= end_date)
    
    total = query.count()
    bills = (
        query
        .order_by(Bill.date.desc(), Bill.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return BillListResponse(
        bills=[BillResponse.model_validate(bill) for bill in bills],
        total=total,
    )


@router.get("/stats", response_model=BillStatsResponse)
def get_bill_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Bill)
    
    if start_date:
        query = query.filter(Bill.date >= start_date)
    
    if end_date:
        query = query.filter(Bill.date <= end_date)
    
    total_expense = (
        query.filter(Bill.type == BillType.EXPENSE)
        .with_entities(func.sum(Bill.amount))
        .scalar() or 0.0
    )
    
    total_income = (
        query.filter(Bill.type == BillType.INCOME)
        .with_entities(func.sum(Bill.amount))
        .scalar() or 0.0
    )
    
    total_count = query.count()
    
    expense_by_category_result = (
        query.filter(Bill.type == BillType.EXPENSE)
        .with_entities(Bill.category, func.sum(Bill.amount))
        .group_by(Bill.category)
        .all()
    )
    expense_by_category = {cat: float(amount) for cat, amount in expense_by_category_result}
    
    expense_by_month_result = (
        query.filter(Bill.type == BillType.EXPENSE)
        .with_entities(
            func.substr(Bill.date, 1, 7).label('month'),
            func.sum(Bill.amount)
        )
        .group_by(func.substr(Bill.date, 1, 7))
        .order_by('month')
        .all()
    )
    expense_by_month = {month: float(amount) for month, amount in expense_by_month_result}
    
    return BillStatsResponse(
        total_expense=total_expense,
        total_income=total_income,
        total_count=total_count,
        expense_by_category=expense_by_category,
        expense_by_month=expense_by_month,
    )


@router.post("/upload/csv", response_model=UploadResult)
async def upload_csv(
    file: UploadFile = File(...),
    source: str = Form("auto"),
    db: Session = Depends(get_db),
):
    content = await file.read()
    
    detected_encoding = chardet.detect(content)
    encoding = detected_encoding.get('encoding', 'utf-8')
    
    try:
        text_content = content.decode(encoding)
    except UnicodeDecodeError:
        text_content = content.decode('gbk', errors='ignore')
    
    parsed_source = source
    if source == 'auto':
        detected = detect_bill_source(text_content)
        if detected:
            parsed_source = detected
    
    bill_data_list = parse_bill_content(text_content, parsed_source)
    
    if not bill_data_list:
        return UploadResult(
            success=False,
            message="未能解析任何账单数据，请检查文件格式",
        )
    
    descriptions = [bill.description for bill in bill_data_list]
    classifications = classify_texts(descriptions)
    
    created_bills: List[Bill] = []
    
    for bill_data, (category, confidence) in zip(bill_data_list, classifications):
        bill_type = BillType.EXPENSE if bill_data.bill_type == 'expense' else BillType.INCOME
        bill_source = (
            BillSource.WECHAT if parsed_source == 'wechat' 
            else BillSource.ALIPAY if parsed_source == 'alipay' 
            else BillSource.WECHAT
        )
        
        bill = Bill(
            date=bill_data.date,
            description=bill_data.description,
            amount=bill_data.amount,
            type=bill_type,
            category=category if bill_data.category == '其他' else bill_data.category,
            source=bill_source,
        )
        
        db.add(bill)
        created_bills.append(bill)
    
    db.commit()
    
    for bill in created_bills:
        db.refresh(bill)
    
    return UploadResult(
        success=True,
        message=f"成功导入 {len(created_bills)} 条账单",
        count=len(created_bills),
        bills=[BillResponse.model_validate(bill) for bill in created_bills],
    )


@router.post("/upload/ocr", response_model=OCRResult)
async def upload_ocr(
    file: UploadFile = File(...),
    parsed_data: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="请上传图片文件")
    
    import json
    
    bills_data: List[dict] = []
    if parsed_data:
        try:
            bills_data = json.loads(parsed_data)
        except json.JSONDecodeError:
            pass
    
    if not bills_data:
        return OCRResult(
            success=False,
            message="OCR 解析数据为空",
        )
    
    created_bills: List[Bill] = []
    
    for bill_item in bills_data:
        description = bill_item.get('description', 'OCR识别')
        category, confidence = classify_text(description)
        
        bill_type = BillType.EXPENSE
        if bill_item.get('type') == 'income':
            bill_type = BillType.INCOME
        
        bill = Bill(
            date=bill_item.get('date', datetime.now().strftime('%Y-%m-%d')),
            description=description,
            amount=bill_item.get('amount', 0),
            type=bill_type,
            category=category,
            source=BillSource.OCR,
        )
        
        db.add(bill)
        created_bills.append(bill)
    
    db.commit()
    
    for bill in created_bills:
        db.refresh(bill)
    
    return OCRResult(
        success=True,
        message=f"成功导入 {len(created_bills)} 条 OCR 识别账单",
        bills=[BillResponse.model_validate(bill) for bill in created_bills],
    )


@router.put("/{bill_id}/category", response_model=BillResponse)
def update_bill_category(
    bill_id: int,
    bill_update: BillUpdate,
    db: Session = Depends(get_db),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="账单不存在")
    
    if bill_update.category:
        bill.category = bill_update.category
    
    db.commit()
    db.refresh(bill)
    
    return BillResponse.model_validate(bill)


@router.delete("/{bill_id}")
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    
    if not bill:
        raise HTTPException(status_code=404, detail="账单不存在")
    
    db.delete(bill)
    db.commit()
    
    return {"message": "删除成功"}
