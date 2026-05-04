from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from ..database import get_session
from ..models.case import Case, CaseRead, CaseCreate, CaseUpdate
from ..models.document import Document, DocumentRead


router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("/", response_model=List[CaseRead])
def list_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    case_type: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = select(Case)
    
    if case_type:
        query = query.where(Case.case_type == case_type)
    if status:
        query = query.where(Case.status == status)
    
    query = query.order_by(Case.created_at.desc()).offset(skip).limit(limit)
    cases = session.exec(query).all()
    return cases


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case with id {case_id} not found")
    return case


@router.post("/", response_model=CaseRead)
def create_case(case_data: CaseCreate, session: Session = Depends(get_session)):
    case = Case(
        title=case_data.title,
        description=case_data.description,
        case_type=case_data.case_type,
        status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@router.put("/{case_id}", response_model=CaseRead)
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    session: Session = Depends(get_session)
):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case with id {case_id} not found")
    
    update_data = case_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)
    
    case.updated_at = datetime.utcnow()
    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@router.delete("/{case_id}")
def delete_case(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case with id {case_id} not found")
    
    session.delete(case)
    session.commit()
    return {"message": f"Case {case_id} deleted successfully"}


@router.get("/{case_id}/documents", response_model=List[DocumentRead])
def get_case_documents(case_id: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case with id {case_id} not found")
    
    query = select(Document).where(Document.case_id == case_id).order_by(Document.created_at.desc())
    documents = session.exec(query).all()
    return documents
