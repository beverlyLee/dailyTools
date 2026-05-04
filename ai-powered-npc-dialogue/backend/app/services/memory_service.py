from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid
import logging

from sqlalchemy.orm import Session
from app.models.dialogue import DialogueHistory, NPCMemory, KnowledgeBase
from app.config import settings

logger = logging.getLogger(__name__)

class MemoryService:
    def __init__(self, db: Session):
        self.db = db
        self.max_history_length = settings.MAX_HISTORY_LENGTH
    
    def get_conversation_history(
        self, 
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, str]]:
        """
        获取对话历史，格式化为LLM可用的格式
        
        Args:
            conversation_id: 对话ID
            limit: 返回消息数量限制
        
        Returns:
            格式化的对话历史列表
        """
        if limit is None:
            limit = self.max_history_length
        
        history = (
            self.db.query(DialogueHistory)
            .filter(DialogueHistory.conversation_id == conversation_id)
            .order_by(DialogueHistory.timestamp.asc())
            .all()
        )
        
        # 限制数量，保持最近的对话
        if len(history) > limit:
            history = history[-limit:]
        
        formatted_history = []
        for msg in history:
            formatted_history.append({
                "role": "user",
                "content": msg.user_message
            })
            formatted_history.append({
                "role": "assistant",
                "content": msg.npc_response
            })
        
        return formatted_history
    
    def save_dialogue(
        self,
        conversation_id: str,
        npc_id: str,
        user_message: str,
        npc_response: str
    ) -> DialogueHistory:
        """
        保存对话记录
        
        Args:
            conversation_id: 对话ID
            npc_id: NPC标识
            user_message: 用户消息
            npc_response: NPC响应
        
        Returns:
            保存的对话记录对象
        """
        dialogue = DialogueHistory(
            conversation_id=conversation_id,
            npc_id=npc_id,
            user_message=user_message,
            npc_response=npc_response,
            timestamp=datetime.utcnow()
        )
        
        self.db.add(dialogue)
        self.db.commit()
        self.db.refresh(dialogue)
        
        logger.info(f"保存对话: conversation_id={conversation_id}, npc_id={npc_id}")
        
        return dialogue
    
    def add_memory(
        self,
        npc_id: str,
        content: str,
        conversation_id: Optional[str] = None,
        memory_type: str = "short_term",
        importance_score: int = 5
    ) -> NPCMemory:
        """
        添加NPC记忆
        
        Args:
            npc_id: NPC标识
            content: 记忆内容
            conversation_id: 关联的对话ID
            memory_type: 记忆类型 (short_term, long_term)
            importance_score: 重要性分数 1-10
        
        Returns:
            创建的记忆对象
        """
        memory = NPCMemory(
            npc_id=npc_id,
            conversation_id=conversation_id,
            memory_type=memory_type,
            content=content,
            importance_score=importance_score,
            created_at=datetime.utcnow(),
            last_accessed=datetime.utcnow()
        )
        
        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)
        
        logger.info(f"添加记忆: npc_id={npc_id}, type={memory_type}")
        
        return memory
    
    def get_npc_memories(
        self,
        npc_id: str,
        memory_type: Optional[str] = None,
        limit: int = 10
    ) -> List[NPCMemory]:
        """
        获取NPC的记忆
        
        Args:
            npc_id: NPC标识
            memory_type: 记忆类型过滤
            limit: 返回数量限制
        
        Returns:
            记忆列表
        """
        query = self.db.query(NPCMemory).filter(NPCMemory.npc_id == npc_id)
        
        if memory_type:
            query = query.filter(NPCMemory.memory_type == memory_type)
        
        # 按重要性分数和最后访问时间排序
        query = query.order_by(
            NPCMemory.importance_score.desc(),
            NPCMemory.last_accessed.desc()
        )
        
        memories = query.limit(limit).all()
        
        # 更新最后访问时间
        for memory in memories:
            memory.last_accessed = datetime.utcnow()
        self.db.commit()
        
        return memories
    
    def get_memory_context(
        self,
        npc_id: str,
        conversation_id: Optional[str] = None,
        limit: int = 5
    ) -> str:
        """
        获取格式化的记忆上下文，用于增强LLM提示词
        
        Args:
            npc_id: NPC标识
            conversation_id: 当前对话ID
            limit: 返回记忆数量
        
        Returns:
            格式化的记忆上下文字符串
        """
        memories = self.get_npc_memories(npc_id, limit=limit)
        
        if not memories:
            return ""
        
        context_parts = ["【NPC记忆】"]
        
        for i, memory in enumerate(memories):
            type_label = "短期" if memory.memory_type == "short_term" else "长期"
            context_parts.append(
                f"{i+1}. [{type_label}记忆] {memory.content}"
            )
        
        return "\n".join(context_parts)
    
    def create_conversation_id(self) -> str:
        """生成唯一的对话ID"""
        return str(uuid.uuid4())
    
    def clear_conversation_history(self, conversation_id: str) -> int:
        """
        清理指定对话的历史记录
        
        Args:
            conversation_id: 对话ID
        
        Returns:
            删除的记录数量
        """
        count = (
            self.db.query(DialogueHistory)
            .filter(DialogueHistory.conversation_id == conversation_id)
            .delete()
        )
        self.db.commit()
        
        logger.info(f"清理对话历史: conversation_id={conversation_id}, 删除{count}条记录")
        
        return count
    
    def consolidate_memories(
        self,
        npc_id: str,
        llm_service: Any
    ) -> int:
        """
        合并/压缩短期记忆为长期记忆
        
        Args:
            npc_id: NPC标识
            llm_service: LLM服务实例（用于摘要生成）
        
        Returns:
            合并的记忆数量
        """
        # 获取所有短期记忆
        short_memories = (
            self.db.query(NPCMemory)
            .filter(
                NPCMemory.npc_id == npc_id,
                NPCMemory.memory_type == "short_term"
            )
            .order_by(NPCMemory.created_at.asc())
            .all()
        )
        
        if len(short_memories) < 3:
            return 0
        
        # 简单的合并策略：将多个短期记忆合并为一个长期记忆
        # 实际项目中可以使用LLM来生成摘要
        
        combined_content = "\n".join([
            f"[{m.created_at.strftime('%Y-%m-%d %H:%M')}] {m.content}"
            for m in short_memories
        ])
        
        # 创建长期记忆
        self.add_memory(
            npc_id=npc_id,
            content=combined_content,
            memory_type="long_term",
            importance_score=7
        )
        
        # 删除短期记忆
        for memory in short_memories:
            self.db.delete(memory)
        self.db.commit()
        
        logger.info(f"合并记忆: npc_id={npc_id}, 合并{len(short_memories)}条短期记忆")
        
        return len(short_memories)
