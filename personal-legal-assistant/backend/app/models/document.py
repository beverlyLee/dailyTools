from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from .case import Case


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id")
    document_type: str
    document_name: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    case: Case = Relationship(back_populates="documents")


class DocumentCreate(SQLModel):
    case_id: int
    document_type: str
    document_name: str
    content: Optional[str] = None


class DocumentRead(SQLModel):
    id: int
    case_id: int
    document_type: str
    document_name: str
    content: str
    created_at: datetime


class AnalysisResult(SQLModel):
    entities: list
    relations: list
    legal_articles: list
    case_type: Optional[str] = None


class SimilarCaseResult(SQLModel):
    title: str
    description: str
    similarity_score: float
    source: Optional[str] = None


class RAGSearchResult(SQLModel):
    query: str
    similar_cases: list[SimilarCaseResult]
    legal_articles: list


class GeneratedDocument(SQLModel):
    document_type: str
    document_name: str
    content: str
