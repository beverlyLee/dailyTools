from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
import json

from database import get_db, TranslationHistory
from models import (
    TranslationRequest, TranslationResponse, 
    PaginatedResponse, BusinessPhrase
)
from services.translation_service import (
    translation_engine, offline_phrases_manager, business_optimizer
)

router = APIRouter(prefix="/translation", tags=["翻译服务"])

@router.post("/translate", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    db: AsyncSession = Depends(get_db)
):
    if request.source_language == request.target_language:
        raise HTTPException(status_code=400, detail="源语言和目标语言不能相同")
    
    offline_match = offline_phrases_manager.find_match(
        request.source_text, 
        request.source_language, 
        request.target_language
    )
    
    if offline_match:
        translated_text = offline_match["translated_text"]
        is_offline = True
    else:
        translated_text = await translation_engine.translate(
            request.source_text,
            request.source_language,
            request.target_language
        )
        translated_text = business_optimizer.optimize_translation(
            translated_text,
            request.source_language,
            request.target_language
        )
        is_offline = False
    
    history = TranslationHistory(
        source_language=request.source_language,
        target_language=request.target_language,
        source_text=request.source_text,
        translated_text=translated_text
    )
    db.add(history)
    await db.commit()
    
    return TranslationResponse(
        source_language=request.source_language,
        target_language=request.target_language,
        source_text=request.source_text,
        translated_text=translated_text,
        is_offline=is_offline
    )

@router.get("/history", response_model=PaginatedResponse)
async def get_translation_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    count_query = select(func.count(TranslationHistory.id))
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    query = select(TranslationHistory).order_by(desc(TranslationHistory.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    histories = result.scalars().all()
    
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[h.to_dict() for h in histories]
    )

@router.delete("/history/{history_id}")
async def delete_translation_history(
    history_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(TranslationHistory).where(TranslationHistory.id == history_id)
    result = await db.execute(query)
    history = result.scalar_one_or_none()
    
    if not history:
        raise HTTPException(status_code=404, detail="翻译历史不存在")
    
    await db.delete(history)
    await db.commit()
    
    return {"message": "删除成功"}

@router.delete("/history")
async def clear_translation_history(
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import delete
    await db.execute(delete(TranslationHistory))
    await db.commit()
    return {"message": "已清空所有翻译历史"}

@router.get("/phrases", response_model=List[BusinessPhrase])
async def get_business_phrases(
    category: Optional[str] = None,
    source_language: str = "zh",
    target_language: str = "en",
    only_favorites: bool = False
):
    if only_favorites:
        phrases = offline_phrases_manager.get_favorite_phrases(
            source_language, target_language
        )
    elif category:
        phrases = offline_phrases_manager.get_phrases_by_category(
            category, source_language, target_language
        )
    else:
        phrases = offline_phrases_manager.get_all_phrases()
    
    return [BusinessPhrase(**p) for p in phrases]

@router.get("/phrase-categories")
async def get_phrase_categories():
    phrases = offline_phrases_manager.get_all_phrases()
    categories = set()
    for phrase in phrases:
        categories.add(phrase.get("category", "general"))
    return {"categories": list(categories)}

@router.post("/phrases", response_model=BusinessPhrase)
async def add_business_phrase(phrase: BusinessPhrase):
    all_phrases = offline_phrases_manager.get_all_phrases()
    new_id = max([p.get("id", 0) for p in all_phrases], default=0) + 1
    
    new_phrase = {
        "id": new_id,
        "category": phrase.category,
        "source_language": phrase.source_language,
        "target_language": phrase.target_language,
        "source_text": phrase.source_text,
        "translated_text": phrase.translated_text,
        "is_favorite": False
    }
    
    category = phrase.category
    if category not in offline_phrases_manager.phrases:
        offline_phrases_manager.phrases[category] = []
    offline_phrases_manager.phrases[category].append(new_phrase)
    offline_phrases_manager._save_phrases()
    
    return BusinessPhrase(**new_phrase)

@router.put("/phrases/{phrase_id}/favorite")
async def toggle_favorite(phrase_id: int, is_favorite: bool = Query(...)):
    phrases = offline_phrases_manager.get_all_phrases()
    
    for phrase in phrases:
        if phrase.get("id") == phrase_id:
            phrase["is_favorite"] = is_favorite
            offline_phrases_manager._save_phrases()
            return {"message": "更新成功", "is_favorite": is_favorite}
    
    raise HTTPException(status_code=404, detail="短语不存在")

@router.delete("/phrases/{phrase_id}")
async def delete_phrase(phrase_id: int):
    for category, phrases in offline_phrases_manager.phrases.items():
        for i, phrase in enumerate(phrases):
            if phrase.get("id") == phrase_id:
                del phrases[i]
                offline_phrases_manager._save_phrases()
                return {"message": "删除成功"}
    
    raise HTTPException(status_code=404, detail="短语不存在")
