from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CardStatus(str, Enum):
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    GRADUATED = "graduated"


class CardBase(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    tags: List[str] = Field(default_factory=list)
    document_id: Optional[str] = None


class CardCreate(CardBase):
    pass


class CardUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    tags: Optional[List[str]] = None


class SM2Stats(BaseModel):
    interval: int = 1
    repetitions: int = 0
    ease_factor: float = 2.5
    next_review: Optional[datetime] = None


class CardResponse(CardBase):
    id: str
    status: CardStatus
    created_at: datetime
    updated_at: datetime
    sm2_stats: SM2Stats
    last_reviewed: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=5)


class ReviewResponse(BaseModel):
    card_id: str
    next_review: datetime
    new_interval: int
    new_ease_factor: float
    new_repetitions: int
    status: CardStatus


class ReviewSession(BaseModel):
    session_id: str
    cards_due: int
    cards_reviewed: int
    start_time: datetime
    end_time: Optional[datetime] = None


class DailyStats(BaseModel):
    date: datetime
    cards_reviewed: int
    average_quality: float
    cards_added: int
