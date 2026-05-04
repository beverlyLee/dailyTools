from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Conversation, Message, TicketStatus
from app.services.llm_service import LLMService
from app.services.faiss_service import FAISSService
from app.services.intent_service import IntentRecognitionService
from app.services.ticket_service import TicketService
from app.config import get_settings

router = APIRouter()
settings = get_settings()

class MessageRequest(BaseModel):
    content: str
    conversation_id: Optional[str] = None
    user_identifier: Optional[str] = None
    user_email: Optional[str] = None

class IntentInfo(BaseModel):
    intent: str
    confidence: float
    can_answer_with_kb: bool
    analysis: str

class TicketInfo(BaseModel):
    ticket_id: str
    ticket_number: str
    status: str
    title: str

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    intent_info: Optional[IntentInfo] = None
    ticket_created: bool = False
    ticket_info: Optional[TicketInfo] = None

@router.post("/message")
async def send_message(
    request: MessageRequest,
    db: AsyncSession = Depends(get_db)
):
    faiss_service = FAISSService()
    llm_service = LLMService(settings.ollama_base_url, settings.ollama_model)
    intent_service = IntentRecognitionService()
    ticket_service = TicketService(db)
    
    conversation = None
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == request.conversation_id)
        )
        conversation = result.scalar_one_or_none()
    
    if not conversation:
        conversation_id = str(uuid4())
        conversation = Conversation(
            id=conversation_id,
            title=request.content[:50] if len(request.content) > 50 else request.content,
            user_identifier=request.user_identifier
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    else:
        conversation_id = conversation.id
    
    intent_info = await intent_service.analyze_intent(request.content)
    kb_relevance = faiss_service.get_relevance_score(request.content)
    should_create_ticket, ticket_reason = intent_service.should_create_ticket(intent_info, kb_relevance)
    
    user_message_id = str(uuid4())
    user_message = Message(
        id=user_message_id,
        conversation_id=conversation_id,
        role="user",
        content=request.content,
        intent=intent_info.get("intent"),
        confidence=intent_info.get("confidence")
    )
    db.add(user_message)
    await db.flush()
    
    context = faiss_service.retrieve(request.content)
    
    history_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    )
    history_messages = history_result.scalars().all()
    
    history = []
    for msg in history_messages:
        history.append({"role": msg.role, "content": msg.content})
    
    ticket_created = False
    ticket_info = None
    assistant_content = ""
    
    if should_create_ticket:
        ticket = await ticket_service.create_ticket_from_conversation(
            conversation_id=conversation_id,
            reason=ticket_reason,
            user_email=request.user_email
        )
        ticket_created = True
        ticket_info = TicketInfo(
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number,
            status=ticket.status.value,
            title=ticket.title
        )
        
        assistant_content = f"""非常抱歉，根据当前知识库，我无法直接回答您的问题。

为了更好地帮助您，我已经为您自动创建了一个工单：
- 工单号: {ticket.ticket_number}
- 当前状态: 待处理

我们的人工客服会尽快查看并处理您的问题。如果您提供了邮箱，我们会将处理进度发送到您的邮箱。

请问还有其他我可以帮助您的吗？"""
    else:
        assistant_content = await llm_service.generate(
            user_input=request.content,
            context=context,
            history=history
        )
        
        if "无法回答" in assistant_content or "知识库" in assistant_content:
            ticket = await ticket_service.create_ticket_from_conversation(
                conversation_id=conversation_id,
                reason="知识库无相关信息，AI无法回答",
                user_email=request.user_email
            )
            ticket_created = True
            ticket_info = TicketInfo(
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                status=ticket.status.value,
                title=ticket.title
            )
            
            assistant_content += f"\n\n为了更好地帮助您，我已经为您创建了工单：{ticket.ticket_number}，人工客服会尽快处理。"
    
    assistant_message_id = str(uuid4())
    assistant_message = Message(
        id=assistant_message_id,
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content
    )
    db.add(assistant_message)
    await db.commit()
    
    await db.refresh(user_message)
    await db.refresh(assistant_message)
    
    return {
        "conversation_id": conversation_id,
        "user_message": {
            "id": user_message_id,
            "role": "user",
            "content": request.content,
            "created_at": user_message.created_at.isoformat() if user_message.created_at else "",
            "intent_info": intent_info if intent_info else None
        },
        "assistant_message": {
            "id": assistant_message_id,
            "role": "assistant",
            "content": assistant_content,
            "created_at": assistant_message.created_at.isoformat() if assistant_message.created_at else ""
        },
        "ticket_created": ticket_created,
        "ticket_info": {
            "ticket_id": ticket_info.ticket_id,
            "ticket_number": ticket_info.ticket_number,
            "status": ticket_info.status,
            "title": ticket_info.title
        } if ticket_info else None
    }

@router.get("/conversations")
async def get_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    return {
        "conversations": [
            {
                "id": conv.id,
                "title": conv.title,
                "user_identifier": conv.user_identifier,
                "created_at": conv.created_at.isoformat() if conv.created_at else "",
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else ""
            }
            for conv in conversations
        ]
    }

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "user_identifier": conversation.user_identifier,
        "created_at": conversation.created_at.isoformat() if conversation.created_at else "",
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else "",
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "intent": msg.intent,
                "confidence": msg.confidence,
                "created_at": msg.created_at.isoformat() if msg.created_at else ""
            }
            for msg in messages
        ]
    }

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conversation)
    await db.commit()
    
    return {"message": "Conversation deleted successfully"}

@router.get("/health")
async def health_check():
    llm_service = LLMService(settings.ollama_base_url, settings.ollama_model)
    ollama_available = llm_service.check_ollama_available()
    
    return {
        "status": "healthy" if ollama_available else "degraded",
        "ollama_available": ollama_available,
        "model": settings.ollama_model
    }
