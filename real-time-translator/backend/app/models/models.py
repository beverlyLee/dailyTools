from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class TranslationHistory(Base):
    __tablename__ = "translation_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_language: Mapped[str] = mapped_column(String(10), nullable=False)
    target_language: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<TranslationHistory id={self.id}>"

class BusinessPhrase(Base):
    __tablename__ = "business_phrases"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    language_code: Mapped[str] = mapped_column(String(10), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_language: Mapped[str] = mapped_column(String(10), nullable=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<BusinessPhrase id={self.id} category={self.category}>"

class LanguagePair(Base):
    __tablename__ = "language_pairs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_code: Mapped[str] = mapped_column(String(10), nullable=False)
    target_code: Mapped[str] = mapped_column(String(10), nullable=False)
    source_name: Mapped[str] = mapped_column(String(50), nullable=False)
    target_name: Mapped[str] = mapped_column(String(50), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    def __repr__(self):
        return f"<LanguagePair {self.source_code}->{self.target_code}>"
