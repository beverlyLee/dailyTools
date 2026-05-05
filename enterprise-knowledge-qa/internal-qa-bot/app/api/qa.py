from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from app.models.qa import (
    QueryRequest,
    QueryResponse,
    SearchRequest,
    SearchResponse,
    Conversation,
    ConversationListResponse,
    ShareConversationRequest,
    ShareConversationResponse,
)
from app.services.qa_service import QAService, get_qa_service
from app.core.config import get_settings

router = APIRouter(prefix="/qa", tags=["问答系统"])
settings = get_settings()


@router.post("/query", response_model=QueryResponse)
async def ask_question(
    request: QueryRequest,
    qa_service: QAService = Depends(get_qa_service),
):
    try:
        response = qa_service.query(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理查询时出错: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def semantic_search(
    request: SearchRequest,
    qa_service: QAService = Depends(get_qa_service),
):
    try:
        response = qa_service.search(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索时出错: {str(e)}")


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    qa_service: QAService = Depends(get_qa_service),
):
    conversations = qa_service.get_all_conversations()
    
    conversations.sort(key=lambda x: x.updated_at, reverse=True)
    
    total = len(conversations)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_conversations = conversations[start:end]
    
    return ConversationListResponse(
        conversations=paginated_conversations,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str,
    qa_service: QAService = Depends(get_qa_service),
):
    conversation = qa_service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    qa_service: QAService = Depends(get_qa_service),
):
    success = qa_service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return {"message": "对话已删除", "conversation_id": conversation_id}


@router.post("/conversations/share", response_model=ShareConversationResponse)
async def share_conversation(
    request: ShareConversationRequest,
    qa_service: QAService = Depends(get_qa_service),
):
    share_id = qa_service.share_conversation(request.conversation_id)
    if not share_id:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    share_url = f"/shared/{share_id}"
    
    return ShareConversationResponse(
        share_id=share_id,
        share_url=share_url,
        expires_at=None,
    )


@router.get("/shared/{share_id}", response_model=Conversation)
async def get_shared_conversation(
    share_id: str,
    qa_service: QAService = Depends(get_qa_service),
):
    conversations = qa_service.get_all_conversations()
    
    for conversation in conversations:
        if conversation.share_id == share_id and conversation.is_shared:
            return conversation
    
    raise HTTPException(status_code=404, detail="分享的对话不存在或已过期")


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "qa-service",
        "llm_type": settings.llm_type,
    }
