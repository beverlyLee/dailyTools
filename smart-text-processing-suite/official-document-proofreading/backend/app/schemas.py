from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    document_type: Optional[str] = None
    red_head_type: Optional[str] = None
    document_number: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    document_type: Optional[str] = None
    status: Optional[str] = None
    red_head_type: Optional[str] = None
    document_number: Optional[str] = None
    change_description: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    document_type: Optional[str]
    status: str
    red_head_type: Optional[str]
    document_number: Optional[str]
    current_version: int
    created_at: datetime
    updated_at: datetime
    word_count: int = 0
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True


class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    content: str
    change_description: Optional[str]
    word_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProofreadRequest(BaseModel):
    text: str = Field(..., min_length=1)
    options: Optional[Dict[str, bool]] = None
    document_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class CorrectionItem(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    original_text: str
    suggested_text: Optional[str]
    position_start: int
    position_end: int
    explanation: str
    severity: str
    confidence: int
    source: str = "rule"
    
    class Config:
        from_attributes = True


class FormatIssueItem(BaseModel):
    issue_id: str
    issue_type: str
    issue_level: str
    description: str
    suggestion: Optional[str]
    line_number: Optional[int]
    position_reference: Optional[str]
    
    class Config:
        from_attributes = True


class PolishSuggestionItem(BaseModel):
    category: str
    original_phrase: str
    suggested_phrase: str
    position_start: int
    position_end: int
    explanation: str
    confidence: float
    
    class Config:
        from_attributes = True


class ProofreadResultResponse(BaseModel):
    text: str
    word_count: int
    character_count: int
    corrections: List[CorrectionItem]
    format_issues: Dict[str, Any]
    polish_suggestions: List[PolishSuggestionItem]
    statistics: Dict[str, Any]
    summary: str
    
    class Config:
        from_attributes = True


class FormatCheckRequest(BaseModel):
    text: str = Field(..., min_length=1)
    format_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class CorrectionApplyRequest(BaseModel):
    text: str = Field(..., min_length=1)
    correction: CorrectionItem
    document_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class BatchCorrectionApplyRequest(BaseModel):
    text: str = Field(..., min_length=1)
    corrections: List[CorrectionItem]
    document_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class CorrectionApplyResponse(BaseModel):
    original_text: str
    corrected_text: str
    applied_count: int
    success: bool
    message: str
    
    class Config:
        from_attributes = True


class StatisticsResponse(BaseModel):
    total_documents: int
    total_versions: int
    total_corrections: int
    document_types: Dict[str, int]
    recent_activity: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True
