from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from typing import Optional, Dict, Any

from ..database import Base


class HistoryRecord(Base):
    __tablename__ = "history_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    source_image = Column(String(500), nullable=False, comment="源图片路径或URL")
    result_image = Column(String(500), nullable=False, comment="结果图片路径或URL")
    
    fashion_style = Column(JSON, nullable=True, comment="服饰风格信息")
    metadata = Column(JSON, nullable=True, comment="额外元数据（迁移强度、分辨率等）")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="更新时间")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_image": self.source_image,
            "result_image": self.result_image,
            "fashion_style": self.fashion_style,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
