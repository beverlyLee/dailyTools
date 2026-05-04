from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models import Ticket, TicketStatus, TicketPriority, Agent, TicketActivity, Conversation

class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _generate_ticket_number(self) -> str:
        today = datetime.utcnow().strftime("%Y%m%d")
        
        result = await self.db.execute(
            select(func.count(Ticket.id)).where(Ticket.ticket_number.like(f"TK-{today}-%"))
        )
        count = result.scalar() or 0
        
        sequence = str(count + 1).zfill(4)
        return f"TK-{today}-{sequence}"
    
    async def create_ticket(
        self,
        title: str,
        description: str,
        conversation_id: Optional[str] = None,
        user_identifier: Optional[str] = None,
        user_email: Optional[str] = None,
        intent_category: Optional[str] = None,
        priority: TicketPriority = TicketPriority.MEDIUM
    ) -> Ticket:
        ticket_number = await self._generate_ticket_number()
        
        ticket = Ticket(
            id=str(uuid4()),
            ticket_number=ticket_number,
            title=title,
            description=description,
            status=TicketStatus.OPEN,
            priority=priority,
            conversation_id=conversation_id,
            user_identifier=user_identifier,
            user_email=user_email,
            intent_category=intent_category
        )
        
        self.db.add(ticket)
        await self.db.flush()
        
        activity = TicketActivity(
            id=str(uuid4()),
            ticket_id=ticket.id,
            activity_type="created",
            description=f"工单 {ticket_number} 已自动创建",
            actor="system"
        )
        self.db.add(activity)
        
        await self.db.commit()
        await self.db.refresh(ticket)
        
        return ticket
    
    async def create_ticket_from_conversation(
        self,
        conversation_id: str,
        reason: str,
        user_email: Optional[str] = None
    ) -> Ticket:
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        messages_result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv_with_messages = messages_result.scalar_one_or_none()
        
        last_message = ""
        if conv_with_messages and conv_with_messages.messages:
            user_messages = [m for m in conv_with_messages.messages if m.role == "user"]
            if user_messages:
                last_message = user_messages[-1].content
        
        title = conversation.title or "用户咨询工单"
        if len(title) > 100:
            title = title[:100]
        
        description = f"""
对话摘要: {conversation.title or '无标题'}

用户最后问题: {last_message}

创建原因: {reason}

对话ID: {conversation_id}
        """.strip()
        
        intent_category = "unknown"
        if conv_with_messages and conv_with_messages.messages:
            last_msg = conv_with_messages.messages[-1] if conv_with_messages.messages else None
            if last_msg and last_msg.intent:
                intent_category = last_msg.intent
        
        priority = TicketPriority.MEDIUM
        if "投诉" in reason or "紧急" in title:
            priority = TicketPriority.HIGH
        
        ticket = await self.create_ticket(
            title=title,
            description=description,
            conversation_id=conversation_id,
            user_identifier=conversation.user_identifier,
            user_email=user_email,
            intent_category=intent_category,
            priority=priority
        )
        
        return ticket
    
    async def get_ticket_by_number(self, ticket_number: str) -> Optional[Ticket]:
        result = await self.db.execute(
            select(Ticket).where(Ticket.ticket_number == ticket_number)
        )
        return result.scalar_one_or_none()
    
    async def get_ticket_by_id(self, ticket_id: str) -> Optional[Ticket]:
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        return result.scalar_one_or_none()
    
    async def update_ticket_status(
        self,
        ticket_id: str,
        new_status: TicketStatus,
        actor: str,
        note: Optional[str] = None
    ) -> Optional[Ticket]:
        ticket = await self.get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        
        old_status = ticket.status
        ticket.status = new_status
        
        if new_status == TicketStatus.RESOLVED or new_status == TicketStatus.CLOSED:
            ticket.resolved_at = datetime.utcnow()
        
        activity_description = f"状态从 {old_status.value} 变更为 {new_status.value}"
        if note:
            activity_description += f"。备注: {note}"
        
        activity = TicketActivity(
            id=str(uuid4()),
            ticket_id=ticket.id,
            activity_type="status_change",
            description=activity_description,
            actor=actor
        )
        self.db.add(activity)
        
        await self.db.commit()
        await self.db.refresh(ticket)
        
        return ticket
    
    async def assign_ticket(
        self,
        ticket_id: str,
        agent_id: str,
        assigned_by: str
    ) -> Optional[Ticket]:
        ticket = await self.get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        
        agent_result = await self.db.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        ticket.assigned_agent_id = agent_id
        
        activity = TicketActivity(
            id=str(uuid4()),
            ticket_id=ticket.id,
            activity_type="assigned",
            description=f"工单已分配给 {agent.name} ({agent.email})",
            actor=assigned_by
        )
        self.db.add(activity)
        
        await self.db.commit()
        await self.db.refresh(ticket)
        
        return ticket
    
    async def get_all_tickets(
        self,
        status: Optional[TicketStatus] = None,
        assigned_agent_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list:
        query = select(Ticket).order_by(Ticket.created_at.desc())
        
        if status:
            query = query.where(Ticket.status == status)
        
        if assigned_agent_id:
            query = query.where(Ticket.assigned_agent_id == assigned_agent_id)
        
        query = query.offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        tickets = result.scalars().all()
        
        return list(tickets)
    
    async def get_ticket_statistics(self) -> dict:
        total_result = await self.db.execute(select(func.count(Ticket.id)))
        total = total_result.scalar() or 0
        
        open_result = await self.db.execute(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN)
        )
        open_count = open_result.scalar() or 0
        
        in_progress_result = await self.db.execute(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.IN_PROGRESS)
        )
        in_progress_count = in_progress_result.scalar() or 0
        
        resolved_result = await self.db.execute(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.RESOLVED)
        )
        resolved_count = resolved_result.scalar() or 0
        
        closed_result = await self.db.execute(
            select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.CLOSED)
        )
        closed_count = closed_result.scalar() or 0
        
        return {
            "total": total,
            "open": open_count,
            "in_progress": in_progress_count,
            "resolved": resolved_count,
            "closed": closed_count
        }
    
    async def add_note(
        self,
        ticket_id: str,
        note: str,
        actor: str
    ) -> Optional[TicketActivity]:
        ticket = await self.get_ticket_by_id(ticket_id)
        if not ticket:
            return None
        
        activity = TicketActivity(
            id=str(uuid4()),
            ticket_id=ticket_id,
            activity_type="note",
            description=f"备注: {note}",
            actor=actor
        )
        self.db.add(activity)
        await self.db.commit()
        await self.db.refresh(activity)
        
        return activity
