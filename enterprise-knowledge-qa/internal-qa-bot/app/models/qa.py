from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SourceReference(BaseModel):
    document_id: str = Field(..., description="来源文档ID")
    document_title: str = Field(..., description="来源文档标题")
    chunk_id: str = Field(..., description="文本块ID")
    content: str = Field(..., description="引用的内容片段")
    page_number: Optional[int] = Field(None, description="页码(如果是PDF)")
    similarity_score: float = Field(..., description="相似度分数")


class QueryRequest(BaseModel):
    query: str = Field(..., description="用户的问题")
    conversation_id: Optional[str] = Field(None, description="对话ID，用于上下文关联")
    top_k: int = Field(default=3, description="返回的相关文档数量")
    include_sources: bool = Field(default=True, description="是否包含来源引用")


class QueryResponse(BaseModel):
    answer: str = Field(..., description="AI生成的回答")
    sources: List[SourceReference] = Field(default=[], description="引用来源列表")
    conversation_id: str = Field(..., description="对话ID")
    query: str = Field(..., description="原始查询")
    response_time: float = Field(..., description="响应时间(秒)")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")


class SearchRequest(BaseModel):
    query: str = Field(..., description="搜索查询")
    top_k: int = Field(default=5, description="返回的相关文档数量")
    document_types: Optional[List[str]] = Field(None, description="文档类型过滤")


class SearchResult(BaseModel):
    document_id: str = Field(..., description="文档ID")
    document_title: str = Field(..., description="文档标题")
    chunk_id: str = Field(..., description="文本块ID")
    content: str = Field(..., description="相关内容")
    similarity_score: float = Field(..., description="相似度分数")
    metadata: dict = Field(default={}, description="元数据")


class SearchResponse(BaseModel):
    query: str = Field(..., description="原始查询")
    results: List[SearchResult] = Field(..., description="搜索结果列表")
    total: int = Field(..., description="总结果数")
    response_time: float = Field(..., description="响应时间(秒)")


class ConversationMessage(BaseModel):
    id: str = Field(..., description="消息ID")
    role: str = Field(..., description="角色: user 或 assistant")
    content: str = Field(..., description="消息内容")
    timestamp: datetime = Field(default_factory=datetime.now, description="时间戳")
    sources: Optional[List[SourceReference]] = Field(None, description="引用来源(仅assistant消息)")


class Conversation(BaseModel):
    id: str = Field(..., description="对话ID")
    title: str = Field(..., description="对话标题")
    messages: List[ConversationMessage] = Field(default=[], description="消息列表")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    is_shared: bool = Field(default=False, description="是否已分享")
    share_id: Optional[str] = Field(None, description="分享ID")


class ConversationListResponse(BaseModel):
    conversations: List[Conversation] = Field(..., description="对话列表")
    total: int = Field(..., description="总对话数")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=10, description="每页数量")


class ShareConversationRequest(BaseModel):
    conversation_id: str = Field(..., description="要分享的对话ID")


class ShareConversationResponse(BaseModel):
    share_id: str = Field(..., description="分享ID")
    share_url: str = Field(..., description="分享链接")
    expires_at: Optional[datetime] = Field(None, description="过期时间")
