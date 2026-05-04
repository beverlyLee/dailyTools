from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from datetime import datetime
import enum

from ..database import Base


class BillType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class BillSource(str, enum.Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"
    OCR = "ocr"


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True, nullable=False)
    description = Column(String, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(Enum(BillType), default=BillType.EXPENSE)
    category = Column(String, index=True, default="其他")
    source = Column(Enum(BillSource), default=BillSource.WECHAT)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "description": self.description,
            "amount": self.amount,
            "type": self.type.value if hasattr(self.type, 'value') else self.type,
            "category": self.category,
            "source": self.source.value if hasattr(self.source, 'value') else self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
