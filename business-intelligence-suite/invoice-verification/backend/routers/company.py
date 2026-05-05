from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc

from database import get_db, Company
from models import CompanyCreate, CompanyResponse, PaginatedResponse

router = APIRouter(prefix="/company", tags=["公司管理"])

@router.post("/", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncSession = Depends(get_db)
):
    existing_query = select(Company).where(
        or_(
            Company.name == company_data.name,
            Company.tax_id == company_data.tax_id
        )
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalars().first()
    
    if existing:
        if existing.name == company_data.name:
            raise HTTPException(status_code=400, detail=f"公司名称 '{company_data.name}' 已存在")
        else:
            raise HTTPException(status_code=400, detail=f"税号 '{company_data.tax_id}' 已存在")
    
    company = Company(
        name=company_data.name,
        tax_id=company_data.tax_id,
        address=company_data.address,
        phone=company_data.phone,
        bank_name=company_data.bank_name,
        bank_account=company_data.bank_account,
        is_active=True
    )
    
    db.add(company)
    await db.commit()
    await db.refresh(company)
    
    return CompanyResponse(**company.to_dict() if hasattr(company, 'to_dict') else {
        "id": company.id,
        "name": company.name,
        "tax_id": company.tax_id,
        "address": company.address,
        "phone": company.phone,
        "bank_name": company.bank_name,
        "bank_account": company.bank_account,
        "is_active": company.is_active,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None
    })

@router.get("/", response_model=PaginatedResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    count_query = select(func.count(Company.id))
    query = select(Company)
    
    if is_active is not None:
        count_query = count_query.where(Company.is_active == is_active)
        query = query.where(Company.is_active == is_active)
    
    if keyword:
        keyword_filter = or_(
            Company.name.contains(keyword),
            Company.tax_id.contains(keyword),
            Company.address.contains(keyword)
        )
        count_query = count_query.where(keyword_filter)
        query = query.where(keyword_filter)
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    query = query.order_by(desc(Company.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    items = []
    for company in companies:
        if hasattr(company, 'to_dict'):
            items.append(company.to_dict())
        else:
            items.append({
                "id": company.id,
                "name": company.name,
                "tax_id": company.tax_id,
                "address": company.address,
                "phone": company.phone,
                "bank_name": company.bank_name,
                "bank_account": company.bank_account,
                "is_active": company.is_active,
                "created_at": company.created_at.isoformat() if company.created_at else None,
                "updated_at": company.updated_at.isoformat() if company.updated_at else None
            })
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )

@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Company).where(Company.id == company_id)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    
    if hasattr(company, 'to_dict'):
        return CompanyResponse(**company.to_dict())
    
    return CompanyResponse(
        id=company.id,
        name=company.name,
        tax_id=company.tax_id,
        address=company.address,
        phone=company.phone,
        bank_name=company.bank_name,
        bank_account=company.bank_account,
        is_active=company.is_active,
        created_at=company.created_at.isoformat() if company.created_at else None,
        updated_at=company.updated_at.isoformat() if company.updated_at else None
    )

@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    company_data: CompanyCreate,
    db: AsyncSession = Depends(get_db)
):
    query = select(Company).where(Company.id == company_id)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    
    existing_query = select(Company).where(
        and_(
            Company.id != company_id,
            or_(
                Company.name == company_data.name,
                Company.tax_id == company_data.tax_id
            )
        )
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalars().first()
    
    if existing:
        if existing.name == company_data.name:
            raise HTTPException(status_code=400, detail=f"公司名称 '{company_data.name}' 已存在")
        else:
            raise HTTPException(status_code=400, detail=f"税号 '{company_data.tax_id}' 已存在")
    
    for key, value in company_data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    
    await db.commit()
    await db.refresh(company)
    
    if hasattr(company, 'to_dict'):
        return CompanyResponse(**company.to_dict())
    
    return CompanyResponse(
        id=company.id,
        name=company.name,
        tax_id=company.tax_id,
        address=company.address,
        phone=company.phone,
        bank_name=company.bank_name,
        bank_account=company.bank_account,
        is_active=company.is_active,
        created_at=company.created_at.isoformat() if company.created_at else None,
        updated_at=company.updated_at.isoformat() if company.updated_at else None
    )

@router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Company).where(Company.id == company_id)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    
    await db.delete(company)
    await db.commit()
    
    return {"message": "删除成功"}

@router.put("/{company_id}/toggle-active")
async def toggle_company_active(
    company_id: int,
    is_active: bool = Query(..., description="是否启用"),
    db: AsyncSession = Depends(get_db)
):
    query = select(Company).where(Company.id == company_id)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(status_code=404, detail="公司不存在")
    
    company.is_active = is_active
    await db.commit()
    
    return {"message": "更新成功", "is_active": is_active}

@router.get("/all/active")
async def get_active_companies(
    db: AsyncSession = Depends(get_db)
):
    query = select(Company).where(Company.is_active == True).order_by(Company.name)
    result = await db.execute(query)
    companies = result.scalars().all()
    
    items = []
    for company in companies:
        if hasattr(company, 'to_dict'):
            items.append(company.to_dict())
        else:
            items.append({
                "id": company.id,
                "name": company.name,
                "tax_id": company.tax_id,
                "address": company.address,
                "phone": company.phone,
                "bank_name": company.bank_name,
                "bank_account": company.bank_account,
                "is_active": company.is_active
            })
    
    return {"companies": items}
