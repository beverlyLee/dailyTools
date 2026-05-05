from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class LanguageEnum(str, Enum):
    ZH = "zh"
    EN = "en"
    JA = "ja"
    KO = "ko"

class TranslationRequest(BaseModel):
    source_language: LanguageEnum
    target_language: LanguageEnum
    source_text: str

class TranslationResponse(BaseModel):
    source_language: str
    target_language: str
    source_text: str
    translated_text: str
    is_offline: bool = False

class ASRRequest(BaseModel):
    language: LanguageEnum = LanguageEnum.ZH

class ASRResponse(BaseModel):
    text: str
    is_final: bool = True

class TTSRequest(BaseModel):
    text: str
    language: LanguageEnum = LanguageEnum.ZH

class BusinessPhrase(BaseModel):
    id: Optional[int] = None
    category: str
    source_language: LanguageEnum
    target_language: LanguageEnum
    source_text: str
    translated_text: str
    is_favorite: bool = False

class TranslationHistoryItem(BaseModel):
    id: int
    source_language: str
    target_language: str
    source_text: str
    translated_text: str
    created_at: str

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List

class WebSocketMessage(BaseModel):
    type: str
    data: Optional[dict] = None
