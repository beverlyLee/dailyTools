from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Query

from ..models.card import (
    CardCreate,
    CardUpdate,
    CardResponse,
    ReviewRequest,
    ReviewResponse,
    DailyStats,
    CardStatus,
)
from ..services import sm2_service, index_service

router = APIRouter(prefix="/cards", tags=["spaced-repetition"])


@router.post("", response_model=CardResponse, status_code=201)
async def create_card(card: CardCreate):
    if card.document_id:
        document = index_service.get_document(card.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Referenced document not found")
    
    return sm2_service.create_card(card)


@router.get("", response_model=List[CardResponse])
async def list_cards(
    limit: int = Query(100, ge=1, le=500),
    status: Optional[CardStatus] = Query(None),
):
    cards = sm2_service.get_all_cards(limit=limit)
    
    if status:
        cards = [c for c in cards if c.status == status]
    
    return cards


@router.get("/due", response_model=List[CardResponse])
async def get_due_cards(limit: int = Query(50, ge=1, le=200)):
    return sm2_service.get_cards_due(limit=limit)


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(card_id: str):
    card = sm2_service.get_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.put("/{card_id}", response_model=CardResponse)
async def update_card(card_id: str, update: CardUpdate):
    card = sm2_service.get_card(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    raise HTTPException(
        status_code=501,
        detail="Card update not implemented - create new card or delete existing",
    )


@router.delete("/{card_id}", status_code=204)
async def delete_card(card_id: str):
    success = sm2_service.delete_card(card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Card not found")


@router.post("/{card_id}/review", response_model=ReviewResponse)
async def review_card(card_id: str, request: ReviewRequest):
    result = sm2_service.review_card(card_id, request.quality)
    if not result:
        raise HTTPException(status_code=404, detail="Card not found")
    return result


@router.get("/stats/daily", response_model=List[DailyStats])
async def get_daily_stats(days: int = Query(30, ge=1, le=90)):
    return sm2_service.get_daily_stats(days=days)


@router.get("/stats/status", response_model=Dict[str, int])
async def get_status_counts():
    return sm2_service.get_card_count_by_status()
