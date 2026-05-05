from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class EssaySubmitRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    assignment_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class EssayUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    status: Optional[str] = None
    
    class Config:
        from_attributes = True


class EssayResponse(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    student_name: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    word_count: int = 0
    is_graded: bool = False
    status: str = "submitted"
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EssayListResponse(BaseModel):
    items: List[EssayResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True


class GradingScore(BaseModel):
    total_score: float = 0
    content_score: float = 0
    language_score: float = 0
    structure_score: float = 0
    
    class Config:
        from_attributes = True


class GradingComment(BaseModel):
    content_comment: Optional[str] = None
    language_comment: Optional[str] = None
    structure_comment: Optional[str] = None
    overall_comment: Optional[str] = None
    suggestions: Optional[str] = None
    
    class Config:
        from_attributes = True


class GradingResponse(BaseModel):
    id: int
    essay_id: int
    total_score: float = 0
    content_score: float = 0
    language_score: float = 0
    structure_score: float = 0
    content_comment: Optional[str] = None
    language_comment: Optional[str] = None
    structure_comment: Optional[str] = None
    overall_comment: Optional[str] = None
    suggestions: Optional[str] = None
    grade_level: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class EssayError(BaseModel):
    id: Optional[int] = None
    essay_id: Optional[int] = None
    error_type: str
    severity: str = "minor"
    original_text: str
    corrected_text: Optional[str] = None
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    line_number: Optional[int] = None
    explanation: Optional[str] = None
    
    class Config:
        from_attributes = True


class SyntaxAnalysis(BaseModel):
    id: Optional[int] = None
    essay_id: Optional[int] = None
    word: str
    pos: str
    dep: str
    head: Optional[str] = None
    explanation: Optional[str] = None
    index: int = 0
    
    class Config:
        from_attributes = True


class GradingResultResponse(BaseModel):
    grading: Optional[GradingResponse] = None
    errors: List[EssayError] = []
    syntax_analysis: List[SyntaxAnalysis] = []
    
    class Config:
        from_attributes = True


class TextAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1)
    grade_level: Optional[str] = None
    options: Optional[Dict[str, bool]] = None
    
    class Config:
        from_attributes = True


class AnalysisStatistics(BaseModel):
    total_essays: int = 0
    graded_count: int = 0
    avg_total_score: float = 0
    avg_content_score: float = 0
    avg_language_score: float = 0
    avg_structure_score: float = 0
    
    class Config:
        from_attributes = True


class ClassAnalysis(BaseModel):
    class_name: Optional[str] = None
    total_students: int = 0
    total_essays: int = 0
    avg_score: float = 0
    score_distribution: Dict[str, int] = {}
    common_errors: List[Dict[str, Any]] = []
    
    class Config:
        from_attributes = True


class ErrorTrend(BaseModel):
    date: str
    total_errors: int
    error_types: Dict[str, int]
    
    class Config:
        from_attributes = True
