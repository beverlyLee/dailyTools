from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class NPCCharacter(Base):
    __tablename__ = "npc_characters"
    
    id = Column(Integer, primary_key=True, index=True)
    npc_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    system_prompt = Column(Text, nullable=False)
    avatar = Column(String(50), default="👤")
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_npc_character_id', 'npc_id'),
    )
    
    def __repr__(self):
        return f"<NPCCharacter(npc_id={self.npc_id}, name={self.name})>"


class DialogueHistory(Base):
    __tablename__ = "dialogue_history"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(36), index=True, nullable=False)
    npc_id = Column(String(50), index=True, nullable=False)
    user_message = Column(Text, nullable=False)
    npc_response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_conversation_timestamp', 'conversation_id', 'timestamp'),
        Index('idx_npc_conversation', 'npc_id', 'conversation_id'),
    )
    
    def __repr__(self):
        return f"<DialogueHistory(conversation_id={self.conversation_id}, npc_id={self.npc_id})>"


class NPCMemory(Base):
    __tablename__ = "npc_memory"
    
    id = Column(Integer, primary_key=True, index=True)
    npc_id = Column(String(50), index=True, nullable=False)
    conversation_id = Column(String(36), index=True, nullable=True)
    memory_type = Column(String(20), default="short_term")  # short_term, long_term
    content = Column(Text, nullable=False)
    importance_score = Column(Integer, default=5)  # 1-10
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_npc_memory', 'npc_id', 'memory_type'),
    )
    
    def __repr__(self):
        return f"<NPCMemory(npc_id={self.npc_id}, type={self.memory_type})>"


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(Integer, primary_key=True, index=True)
    npc_id = Column(String(50), index=True, nullable=True)  # NULL表示全局知识
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_npc_knowledge', 'npc_id'),
    )
    
    def __repr__(self):
        return f"<KnowledgeBase(title={self.title}, npc_id={self.npc_id})>"
