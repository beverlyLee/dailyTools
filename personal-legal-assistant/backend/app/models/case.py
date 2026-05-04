from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    case_type: Optional[str] = Field(default=None, index=True)
    status: str = Field(default="pending", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    entities: List["CaseEntity"] = Relationship(back_populates="case")
    relations: List["CaseRelation"] = Relationship(back_populates="case")
    legal_articles: List["LegalArticle"] = Relationship(back_populates="case")
    similar_cases: List["SimilarCase"] = Relationship(back_populates="case")
    documents: List["Document"] = Relationship(back_populates="case")


class CaseEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id")
    entity_text: str
    entity_type: str
    start_pos: Optional[int] = None
    end_pos: Optional[int] = None
    
    case: Case = Relationship(back_populates="entities")


class CaseRelation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id")
    relation_type: str
    subject: str
    object: str
    
    case: Case = Relationship(back_populates="relations")


class LegalArticle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id")
    article_name: str
    article_content: str
    law_type: str
    relevance_score: float = Field(default=0.0)
    
    case: Case = Relationship(back_populates="legal_articles")


class SimilarCase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: int = Field(foreign_key="case.id")
    similar_case_title: str
    similar_case_description: str
    similarity_score: float
    source: Optional[str] = None
    
    case: Case = Relationship(back_populates="similar_cases")


class CaseCreate(SQLModel):
    title: str
    description: str
    case_type: Optional[str] = None


class CaseRead(SQLModel):
    id: int
    title: str
    description: str
    case_type: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class CaseUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    case_type: Optional[str] = None
    status: Optional[str] = None
