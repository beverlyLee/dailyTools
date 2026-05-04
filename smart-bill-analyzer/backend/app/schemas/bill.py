from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class BillType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


class BillSource(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"
    OCR = "ocr"


class BillBase(BaseModel):
    date: str = Field(..., description="账单日期，格式 YYYY-MM-DD")
    description: str = Field(..., description="账单描述")
    amount: float = Field(..., gt=0, description="金额")
    type: BillType = Field(default=BillType.EXPENSE, description="收入或支出")
    category: Optional[str] = Field(default="其他", description="分类")
    source: BillSource = Field(default=BillSource.WECHAT, description="来源")


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None


class BillResponse(BillBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BillListResponse(BaseModel):
    bills: List[BillResponse]
    total: int


class BillStatsResponse(BaseModel):
    total_expense: float
    total_income: float
    total_count: int
    expense_by_category: Dict[str, float]
    expense_by_month: Dict[str, float]


class UploadResult(BaseModel):
    success: bool
    message: str
    count: Optional[int] = None
    bills: Optional[List[BillResponse]] = None


class OCRResult(BaseModel):
    success: bool
    text: Optional[str] = None
    bills: Optional[List[BillResponse]] = None
    message: Optional[str] = None


class ClassificationResult(BaseModel):
    category: str
    confidence: float
