from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    title: str = Field(..., description="文档标题")
    description: Optional[str] = Field(None, description="文档描述")
    tags: List[str] = Field(default=[], description="文档标签")
    file_type: str = Field(..., description="文件类型: pdf, word, markdown")


class DocumentCreate(DocumentBase):
    file_content: bytes = Field(..., description="文件二进制内容")
    file_name: str = Field(..., description="原始文件名")


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, description="文档标题")
    description: Optional[str] = Field(None, description="文档描述")
    tags: Optional[List[str]] = Field(None, description="文档标签")


class DocumentResponse(DocumentBase):
    id: str = Field(..., description="文档ID")
    file_name: str = Field(..., description="原始文件名")
    file_size: int = Field(..., description="文件大小(字节)")
    upload_time: datetime = Field(..., description="上传时间")
    processing_status: str = Field(..., description="处理状态: pending, processing, completed, failed")
    chunk_count: Optional[int] = Field(None, description="分块数量")

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse] = Field(..., description="文档列表")
    total: int = Field(..., description="总文档数")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=10, description="每页数量")
