from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DocumentType(str, Enum):
    WEB_PAGE = "web_page"
    NOTE = "note"
    ARTICLE = "article"
    BOOKMARK = "bookmark"


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    url: Optional[str] = None
    document_type: DocumentType = DocumentType.WEB_PAGE
    tags: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class DocumentCreate(DocumentBase):
    screenshot: Optional[bytes] = None
    screenshot_filename: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[dict] = None


class DocumentResponse(DocumentBase):
    id: str
    created_at: datetime
    updated_at: datetime
    embedding_id: Optional[int] = None
    screenshot_path: Optional[str] = None

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    document: DocumentResponse
    score: float
    highlight: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResult]
    search_time_ms: float


class Entity(BaseModel):
    name: str
    type: str
    count: int


class Relation(BaseModel):
    source: str
    target: str
    relation_type: str
    count: int
