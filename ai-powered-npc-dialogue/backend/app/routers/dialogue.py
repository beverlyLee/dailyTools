from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import asyncio
import json
import logging
import re

from app.database import get_db, init_db
from app.models.dialogue import NPCCharacter, DialogueHistory, NPCMemory
from app.services.llm_service import LLMService
from app.services.memory_service import MemoryService
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter()

DEFAULT_NPCS = [
    {
        "npc_id": "shopkeeper",
        "name": "老店主",
        "description": "村庄杂货店店主",
        "system_prompt": """你是一位和蔼的老店主，在村庄里经营了一家杂货店已有30年。
你对村民很熟悉，喜欢聊天并分享村庄的历史。
你的说话风格：亲切、热情、偶尔会感慨过去的时光。
你会主动询问顾客的需求，并根据情况推荐商品。
你记得经常来的顾客，但对新客人也很友好。""",
        "avatar": "🏪",
        "is_default": True
    },
    {
        "npc_id": "blacksmith",
        "name": "铁匠师傅",
        "description": "村庄铁匠铺师傅",
        "system_prompt": """你是一位沉默寡言但手艺精湛的铁匠。
你说话简短有力，不喜欢废话，但对信任的人会多说几句。
你关心武器和工具的质量，对工艺有着执着的追求。
你的说话风格：简洁、直接、偶尔会给出实用的建议。
你对冒险者的装备很感兴趣，会评估他们武器的质量。""",
        "avatar": "⚒️",
        "is_default": True
    },
    {
        "npc_id": "innkeeper",
        "name": "客栈老板娘",
        "description": "村庄客栈老板娘",
        "system_prompt": """你是一位热情好客的客栈老板娘，消息灵通，知道村庄里的大小事。
你喜欢听故事，也会分享你听到的消息，但不会随便传播谣言。
你的说话风格：活泼、八卦、关心他人、会提供食宿建议。
你对远方来的客人特别感兴趣，会询问他们旅途的见闻。
你记得每位客人的喜好，会贴心地提供个性化服务。""",
        "avatar": "🏨",
        "is_default": True
    }
]


class CreateNPCRequest(BaseModel):
    npc_id: str
    name: str
    description: Optional[str] = ""
    system_prompt: str
    avatar: Optional[str] = "👤"


class UpdateNPCRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    avatar: Optional[str] = None
    is_active: Optional[bool] = None


class DialogueRequest(BaseModel):
    conversation_id: Optional[str] = None
    npc_id: str = "shopkeeper"
    message: str
    temperature: float = 0.7
    max_tokens: int = 1024
    use_rag: bool = True
    use_memory: bool = True
    auto_save_memory: bool = True


class DialogueResponse(BaseModel):
    conversation_id: str
    npc_id: str
    npc_name: str
    response: str
    context_info: Dict[str, Any]


class ConversationHistoryItem(BaseModel):
    id: int
    user_message: str
    npc_response: str
    timestamp: str


def init_default_npcs(db: Session):
    """初始化默认NPC到数据库"""
    for npc_data in DEFAULT_NPCS:
        existing = db.query(NPCCharacter).filter(
            NPCCharacter.npc_id == npc_data["npc_id"]
        ).first()
        
        if not existing:
            npc = NPCCharacter(**npc_data)
            db.add(npc)
    
    db.commit()
    logger.info("默认NPC初始化完成")


def get_npc_by_id(db: Session, npc_id: str) -> Optional[NPCCharacter]:
    """根据ID获取NPC"""
    return db.query(NPCCharacter).filter(
        NPCCharacter.npc_id == npc_id,
        NPCCharacter.is_active == True
    ).first()


def get_all_npcs(db: Session) -> List[NPCCharacter]:
    """获取所有活跃的NPC"""
    return db.query(NPCCharacter).filter(
        NPCCharacter.is_active == True
    ).all()


def extract_key_memory(user_message: str, npc_response: str) -> Optional[str]:
    """
    从对话中提取可能需要记住的关键信息
    这是一个简单的实现，可以根据需要增强
    """
    key_patterns = [
        r'我叫(.{2,10})',
        r'我的名字是(.{2,10})',
        r'我来自(.{2,20})',
        r'我是(.{2,15})',
        r'我喜欢(.{2,20})',
        r'我的(.{2,10})是',
        r'记住(.{2,50})',
    ]
    
    memories = []
    
    for pattern in key_patterns:
        matches = re.findall(pattern, user_message)
        for match in matches:
            if match.strip() and len(match.strip()) > 1:
                memories.append(f"用户提到：{match.strip()}")
    
    if len(memories) > 0:
        return "; ".join(memories)
    
    return None


@router.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        init_db()
        logger.info("数据库初始化完成")
        
        init_default_npcs(db)
        logger.info("默认NPC初始化完成")
        
        rag_service.build_index()
        logger.info("RAG索引构建完成")
    finally:
        db.close()


@router.get("/npcs")
async def get_npcs(db: Session = Depends(get_db)):
    """获取所有可用的NPC列表"""
    npcs = get_all_npcs(db)
    
    return {
        "npcs": [
            {
                "id": npc.npc_id,
                "npc_id": npc.npc_id,
                "name": npc.name,
                "description": npc.description or "",
                "avatar": npc.avatar,
                "is_default": npc.is_default
            }
            for npc in npcs
        ]
    }


@router.post("/npcs")
async def create_npc(npc_data: CreateNPCRequest, db: Session = Depends(get_db)):
    """创建新的NPC"""
    existing = db.query(NPCCharacter).filter(
        NPCCharacter.npc_id == npc_data.npc_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"NPC ID '{npc_data.npc_id}' 已存在"
        )
    
    npc = NPCCharacter(
        npc_id=npc_data.npc_id,
        name=npc_data.name,
        description=npc_data.description,
        system_prompt=npc_data.system_prompt,
        avatar=npc_data.avatar or "👤",
        is_default=False,
        is_active=True
    )
    
    db.add(npc)
    db.commit()
    db.refresh(npc)
    
    logger.info(f"创建新NPC: {npc.npc_id} - {npc.name}")
    
    return {
        "success": True,
        "npc": {
            "id": npc.npc_id,
            "npc_id": npc.npc_id,
            "name": npc.name,
            "description": npc.description,
            "avatar": npc.avatar
        }
    }


@router.put("/npcs/{npc_id}")
async def update_npc(npc_id: str, update_data: UpdateNPCRequest, db: Session = Depends(get_db)):
    """更新NPC信息"""
    npc = get_npc_by_id(db, npc_id)
    
    if not npc:
        raise HTTPException(
            status_code=404,
            detail=f"NPC '{npc_id}' 不存在"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for key, value in update_dict.items():
        if value is not None:
            setattr(npc, key, value)
    
    db.commit()
    db.refresh(npc)
    
    logger.info(f"更新NPC: {npc_id}")
    
    return {
        "success": True,
        "npc": {
            "id": npc.npc_id,
            "name": npc.name,
            "description": npc.description,
            "avatar": npc.avatar,
            "is_active": npc.is_active
        }
    }


@router.delete("/npcs/{npc_id}")
async def delete_npc(npc_id: str, db: Session = Depends(get_db)):
    """删除NPC（软删除）"""
    npc = db.query(NPCCharacter).filter(
        NPCCharacter.npc_id == npc_id
    ).first()
    
    if not npc:
        raise HTTPException(
            status_code=404,
            detail=f"NPC '{npc_id}' 不存在"
        )
    
    if npc.is_default:
        raise HTTPException(
            status_code=400,
            detail="不能删除默认NPC"
        )
    
    npc.is_active = False
    db.commit()
    
    logger.info(f"删除NPC: {npc_id}")
    
    return {"success": True, "message": f"NPC '{npc_id}' 已删除"}


@router.get("/npcs/{npc_id}/conversations")
async def get_npc_conversations(npc_id: str, db: Session = Depends(get_db)):
    """获取指定NPC的所有对话会话列表"""
    npc = get_npc_by_id(db, npc_id)
    if not npc:
        raise HTTPException(
            status_code=404,
            detail=f"NPC '{npc_id}' 不存在"
        )
    
    from sqlalchemy import func
    
    conversations = (
        db.query(
            DialogueHistory.conversation_id,
            func.min(DialogueHistory.timestamp).label('start_time'),
            func.max(DialogueHistory.timestamp).label('last_time'),
            func.count(DialogueHistory.id).label('message_count')
        )
        .filter(DialogueHistory.npc_id == npc_id)
        .group_by(DialogueHistory.conversation_id)
        .order_by(func.max(DialogueHistory.timestamp).desc())
        .all()
    )
    
    return {
        "npc_id": npc_id,
        "conversations": [
            {
                "conversation_id": conv.conversation_id,
                "start_time": conv.start_time.isoformat() if conv.start_time else None,
                "last_time": conv.last_time.isoformat() if conv.last_time else None,
                "message_count": conv.message_count
            }
            for conv in conversations
        ]
    }


@router.get("/npcs/{npc_id}/memories")
async def get_npc_memories_api(npc_id: str, db: Session = Depends(get_db)):
    """获取NPC的记忆"""
    npc = get_npc_by_id(db, npc_id)
    if not npc:
        raise HTTPException(
            status_code=404,
            detail=f"NPC '{npc_id}' 不存在"
        )
    
    memory_service = MemoryService(db)
    memories = memory_service.get_npc_memories(npc_id, limit=20)
    
    return {
        "npc_id": npc_id,
        "memories": [
            {
                "id": m.id,
                "content": m.content,
                "memory_type": m.memory_type,
                "importance_score": m.importance_score,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "last_accessed": m.last_accessed.isoformat() if m.last_accessed else None
            }
            for m in memories
        ]
    }


@router.post("/npcs/{npc_id}/memories")
async def add_npc_memory(
    npc_id: str,
    content: str,
    memory_type: str = "long_term",
    importance_score: int = 5,
    db: Session = Depends(get_db)
):
    """手动为NPC添加记忆"""
    npc = get_npc_by_id(db, npc_id)
    if not npc:
        raise HTTPException(
            status_code=404,
            detail=f"NPC '{npc_id}' 不存在"
        )
    
    memory_service = MemoryService(db)
    memory = memory_service.add_memory(
        npc_id=npc_id,
        content=content,
        memory_type=memory_type,
        importance_score=importance_score
    )
    
    return {
        "success": True,
        "memory": {
            "id": memory.id,
            "content": memory.content,
            "memory_type": memory.memory_type
        }
    }


@router.post("/chat", response_model=DialogueResponse)
async def chat(
    request: DialogueRequest,
    db: Session = Depends(get_db)
):
    """
    与NPC进行对话
    
    这是主要的对话接口，支持：
    - 上下文记忆（每个NPC独立）
    - RAG知识库检索
    - NPC角色设定
    - 自动记忆提取
    """
    try:
        npc = get_npc_by_id(db, request.npc_id)
        if not npc:
            raise HTTPException(
                status_code=404,
                detail=f"NPC '{request.npc_id}' 不存在或已被删除"
            )
        
        llm_service = LLMService()
        memory_service = MemoryService(db)
        
        conversation_id = request.conversation_id or memory_service.create_conversation_id()
        
        context_info = {
            "conversation_id": conversation_id,
            "npc_id": request.npc_id,
            "npc_name": npc.name,
            "use_rag": request.use_rag,
            "use_memory": request.use_memory,
            "rag_results": [],
            "memory_results": [],
            "new_memory_extracted": None
        }
        
        system_prompt = npc.system_prompt
        
        if request.use_rag:
            rag_context = rag_service.get_context_for_query(request.message)
            if rag_context:
                context_info["rag_results"] = rag_service.search(request.message)
                system_prompt += f"\n\n【相关背景信息】\n{rag_context}\n\n请根据以上信息回答用户的问题，如果信息不足，可以按角色设定正常回答。"
        
        conversation_history = []
        if request.use_memory and request.conversation_id:
            conversation_history = memory_service.get_conversation_history(
                conversation_id=conversation_id
            )
        
        if request.use_memory:
            memory_context = memory_service.get_memory_context(request.npc_id)
            if memory_context:
                context_info["memory_results"] = [
                    {"content": m.content, "type": m.memory_type}
                    for m in memory_service.get_npc_memories(request.npc_id, limit=5)
                ]
                system_prompt += f"\n\n{memory_context}\n\n这些是你记得的重要信息，可以在对话中自然地提及。"
        
        response = await llm_service.generate(
            prompt=request.message,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        memory_service.save_dialogue(
            conversation_id=conversation_id,
            npc_id=request.npc_id,
            user_message=request.message,
            npc_response=response
        )
        
        if request.auto_save_memory:
            extracted_memory = extract_key_memory(request.message, response)
            if extracted_memory:
                memory_service.add_memory(
                    npc_id=request.npc_id,
                    content=extracted_memory,
                    conversation_id=conversation_id,
                    memory_type="short_term",
                    importance_score=6
                )
                context_info["new_memory_extracted"] = extracted_memory
                logger.info(f"为NPC {request.npc_id} 提取记忆: {extracted_memory}")
        
        return DialogueResponse(
            conversation_id=conversation_id,
            npc_id=request.npc_id,
            npc_name=npc.name,
            response=response,
            context_info=context_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"对话处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"对话处理失败: {str(e)}"
        )


@router.get("/history/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """获取指定对话的历史记录"""
    memory_service = MemoryService(db)
    
    from app.models.dialogue import DialogueHistory
    
    history = (
        db.query(DialogueHistory)
        .filter(DialogueHistory.conversation_id == conversation_id)
        .order_by(DialogueHistory.timestamp.asc())
        .all()
    )
    
    return {
        "conversation_id": conversation_id,
        "history": [
            {
                "id": h.id,
                "npc_id": h.npc_id,
                "user_message": h.user_message,
                "npc_response": h.npc_response,
                "timestamp": h.timestamp.isoformat()
            }
            for h in history
        ]
    }


@router.delete("/history/{conversation_id}")
async def clear_conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """清除指定对话的历史记录"""
    memory_service = MemoryService(db)
    count = memory_service.clear_conversation_history(conversation_id)
    
    return {
        "conversation_id": conversation_id,
        "deleted_count": count
    }


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """健康检查接口"""
    llm_service = LLMService()
    llm_health = await llm_service.check_health()
    
    npc_count = db.query(NPCCharacter).filter(NPCCharacter.is_active == True).count()
    
    return {
        "status": "healthy",
        "llm_service": llm_health,
        "rag_status": "ready" if rag_service.vector_store else "not_initialized",
        "active_npcs": npc_count
    }
