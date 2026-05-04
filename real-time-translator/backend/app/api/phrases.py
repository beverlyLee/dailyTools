from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.database import get_db
from app.models.models import BusinessPhrase, TranslationHistory
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/phrases", tags=["商务短语"])

class PhraseCreate(BaseModel):
    category: str
    language_code: str
    original_text: str
    translated_text: str
    target_language: str = "en"

class PhraseUpdate(BaseModel):
    category: Optional[str] = None
    original_text: Optional[str] = None
    translated_text: Optional[str] = None
    is_active: Optional[bool] = None

class PhraseResponse(BaseModel):
    id: int
    category: str
    language_code: str
    original_text: str
    translated_text: str
    target_language: str
    usage_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[PhraseResponse])
async def get_phrases(
    category: Optional[str] = None,
    language_code: Optional[str] = None,
    target_language: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db)
):
    query = select(BusinessPhrase)
    
    if category:
        query = query.where(BusinessPhrase.category == category)
    if language_code:
        query = query.where(BusinessPhrase.language_code == language_code)
    if target_language:
        query = query.where(BusinessPhrase.target_language == target_language)
    if is_active is not None:
        query = query.where(BusinessPhrase.is_active == is_active)
    
    query = query.order_by(BusinessPhrase.usage_count.desc())
    
    result = await db.execute(query)
    phrases = result.scalars().all()
    
    return phrases

@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    query = select(BusinessPhrase.category).distinct()
    result = await db.execute(query)
    categories = result.scalars().all()
    
    default_categories = [
        "问候与介绍",
        "商务会议",
        "价格谈判",
        "合同条款",
        "产品介绍",
        "客户服务",
        "电子邮件",
        "电话沟通"
    ]
    
    all_categories = list(set(default_categories + categories))
    
    return {"categories": all_categories}

@router.post("/", response_model=PhraseResponse)
async def create_phrase(
    phrase_data: PhraseCreate,
    db: AsyncSession = Depends(get_db)
):
    new_phrase = BusinessPhrase(
        category=phrase_data.category,
        language_code=phrase_data.language_code,
        original_text=phrase_data.original_text,
        translated_text=phrase_data.translated_text,
        target_language=phrase_data.target_language
    )
    
    db.add(new_phrase)
    await db.commit()
    await db.refresh(new_phrase)
    
    return new_phrase

@router.get("/{phrase_id}", response_model=PhraseResponse)
async def get_phrase(
    phrase_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(BusinessPhrase).where(BusinessPhrase.id == phrase_id)
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        raise HTTPException(status_code=404, detail="短语不存在")
    
    return phrase

@router.put("/{phrase_id}", response_model=PhraseResponse)
async def update_phrase(
    phrase_id: int,
    phrase_data: PhraseUpdate,
    db: AsyncSession = Depends(get_db)
):
    query = select(BusinessPhrase).where(BusinessPhrase.id == phrase_id)
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        raise HTTPException(status_code=404, detail="短语不存在")
    
    update_data = phrase_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(phrase, key, value)
    
    await db.commit()
    await db.refresh(phrase)
    
    return phrase

@router.delete("/{phrase_id}")
async def delete_phrase(
    phrase_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(BusinessPhrase).where(BusinessPhrase.id == phrase_id)
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        raise HTTPException(status_code=404, detail="短语不存在")
    
    await db.delete(phrase)
    await db.commit()
    
    return {"message": "短语已删除"}

@router.post("/{phrase_id}/use")
async def use_phrase(
    phrase_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(BusinessPhrase).where(BusinessPhrase.id == phrase_id)
    result = await db.execute(query)
    phrase = result.scalar_one_or_none()
    
    if not phrase:
        raise HTTPException(status_code=404, detail="短语不存在")
    
    phrase.usage_count += 1
    await db.commit()
    
    return {"message": "使用次数已更新", "usage_count": phrase.usage_count}

@router.get("/history/")
async def get_translation_history(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    query = select(TranslationHistory).order_by(TranslationHistory.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    histories = result.scalars().all()
    
    return [
        {
            "id": h.id,
            "source_text": h.source_text,
            "translated_text": h.translated_text,
            "source_language": h.source_language,
            "target_language": h.target_language,
            "created_at": h.created_at
        }
        for h in histories
    ]
