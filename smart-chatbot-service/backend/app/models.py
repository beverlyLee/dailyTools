from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base

class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tickets: Mapped[List["Ticket"]] = relationship("Ticket", back_populates="assigned_agent")

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    user_identifier: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    tickets: Mapped[List["Ticket"]] = relationship("Ticket", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[Optional[str]] = mapped_column(String(50))
    confidence: Mapped[Optional[float]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[TicketStatus] = mapped_column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    priority: Mapped[TicketPriority] = mapped_column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id"))
    assigned_agent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("agents.id"))
    user_identifier: Mapped[Optional[str]] = mapped_column(String(255))
    user_email: Mapped[Optional[str]] = mapped_column(String(255))
    
    intent_category: Mapped[Optional[str]] = mapped_column(String(100))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation", back_populates="tickets")
    assigned_agent: Mapped[Optional["Agent"]] = relationship("Agent", back_populates="tickets")
    activities: Mapped[List["TicketActivity"]] = relationship("TicketActivity", back_populates="ticket", order_by="TicketActivity.created_at")

class TicketActivity(Base):
    __tablename__ = "ticket_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="activities")
