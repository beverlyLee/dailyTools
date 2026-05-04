from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Ticket, TicketStatus, TicketPriority, Agent, TicketActivity
from app.services.ticket_service import TicketService
from app.config import get_settings

router = APIRouter()
settings = get_settings()

class TicketCreateRequest(BaseModel):
    title: str
    description: str
    user_identifier: Optional[str] = None
    user_email: Optional[str] = None
    priority: str = "medium"
    conversation_id: Optional[str] = None

class TicketUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    note: Optional[str] = None

class AgentCreateRequest(BaseModel):
    name: str
    email: str
    department: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    title: str
    description: Optional[str]
    status: str
    priority: str
    conversation_id: Optional[str]
    assigned_agent_id: Optional[str]
    user_identifier: Optional[str]
    user_email: Optional[str]
    intent_category: Optional[str]
    resolved_at: Optional[str]
    created_at: str
    updated_at: str

class TicketActivityResponse(BaseModel):
    id: str
    ticket_id: str
    activity_type: str
    description: str
    actor: Optional[str]
    created_at: str

class AgentResponse(BaseModel):
    id: str
    name: str
    email: str
    department: Optional[str]
    created_at: str
    updated_at: str

@router.post("/")
async def create_ticket(
    request: TicketCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    ticket_service = TicketService(db)
    
    priority_map = {
        "low": TicketPriority.LOW,
        "medium": TicketPriority.MEDIUM,
        "high": TicketPriority.HIGH,
        "urgent": TicketPriority.URGENT
    }
    
    priority = priority_map.get(request.priority.lower(), TicketPriority.MEDIUM)
    
    ticket = await ticket_service.create_ticket(
        title=request.title,
        description=request.description,
        conversation_id=request.conversation_id,
        user_identifier=request.user_identifier,
        user_email=request.user_email,
        intent_category="manual",
        priority=priority
    )
    
    return {
        "message": "Ticket created successfully",
        "ticket": {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "status": ticket.status.value,
            "priority": ticket.priority.value
        }
    }

@router.get("/")
async def get_tickets(
    status: Optional[str] = Query(None, description="Filter by status: open, in_progress, resolved, closed"),
    assigned_agent_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    ticket_service = TicketService(db)
    
    status_enum = None
    if status:
        try:
            status_enum = TicketStatus(status.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    tickets = await ticket_service.get_all_tickets(
        status=status_enum,
        assigned_agent_id=assigned_agent_id,
        limit=limit,
        offset=offset
    )
    
    return {
        "total": len(tickets),
        "tickets": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "description": t.description,
                "status": t.status.value,
                "priority": t.priority.value,
                "conversation_id": t.conversation_id,
                "assigned_agent_id": t.assigned_agent_id,
                "user_identifier": t.user_identifier,
                "user_email": t.user_email,
                "intent_category": t.intent_category,
                "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else "",
                "updated_at": t.updated_at.isoformat() if t.updated_at else ""
            }
            for t in tickets
        ]
    }

@router.get("/statistics")
async def get_ticket_statistics(
    db: AsyncSession = Depends(get_db)
):
    ticket_service = TicketService(db)
    stats = await ticket_service.get_ticket_statistics()
    return stats

@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db)
):
    ticket_service = TicketService(db)
    ticket = await ticket_service.get_ticket_by_id(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    activities_result = await db.execute(
        select(TicketActivity).where(TicketActivity.ticket_id == ticket_id).order_by(TicketActivity.created_at)
    )
    activities = activities_result.scalars().all()
    
    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "title": ticket.title,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "conversation_id": ticket.conversation_id,
        "assigned_agent_id": ticket.assigned_agent_id,
        "user_identifier": ticket.user_identifier,
        "user_email": ticket.user_email,
        "intent_category": ticket.intent_category,
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else "",
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else "",
        "activities": [
            {
                "id": a.id,
                "activity_type": a.activity_type,
                "description": a.description,
                "actor": a.actor,
                "created_at": a.created_at.isoformat() if a.created_at else ""
            }
            for a in activities
        ]
    }

@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    request: TicketUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    ticket_service = TicketService(db)
    ticket = await ticket_service.get_ticket_by_id(ticket_id)
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if request.status:
        try:
            new_status = TicketStatus(request.status.lower())
            ticket = await ticket_service.update_ticket_status(
                ticket_id=ticket_id,
                new_status=new_status,
                actor="admin",
                note=request.note
            )
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {request.status}")
    
    if request.priority:
        try:
            new_priority = TicketPriority(request.priority.lower())
            ticket.priority = new_priority
            await db.commit()
            await db.refresh(ticket)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {request.priority}")
    
    if request.assigned_agent_id:
        try:
            ticket = await ticket_service.assign_ticket(
                ticket_id=ticket_id,
                agent_id=request.assigned_agent_id,
                assigned_by="admin"
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    
    if request.note and not request.status:
        await ticket_service.add_note(
            ticket_id=ticket_id,
            note=request.note,
            actor="admin"
        )
    
    return {
        "message": "Ticket updated successfully",
        "ticket": {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status.value,
            "priority": ticket.priority.value,
            "assigned_agent_id": ticket.assigned_agent_id
        }
    }

@router.post("/agents/")
async def create_agent(
    request: AgentCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    existing_agent = await db.execute(
        select(Agent).where(Agent.email == request.email)
    )
    if existing_agent.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Agent with this email already exists")
    
    agent = Agent(
        id=str(uuid4()),
        name=request.name,
        email=request.email,
        department=request.department
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    return {
        "message": "Agent created successfully",
        "agent": {
            "id": agent.id,
            "name": agent.name,
            "email": agent.email,
            "department": agent.department
        }
    }

@router.get("/agents/")
async def get_agents(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).order_by(Agent.created_at.desc())
    )
    agents = result.scalars().all()
    
    return {
        "total": len(agents),
        "agents": [
            {
                "id": a.id,
                "name": a.name,
                "email": a.email,
                "department": a.department,
                "created_at": a.created_at.isoformat() if a.created_at else "",
                "updated_at": a.updated_at.isoformat() if a.updated_at else ""
            }
            for a in agents
        ]
    }
