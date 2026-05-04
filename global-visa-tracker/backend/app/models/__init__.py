from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlmodel import SQLModel, Field, Column, JSON
from enum import Enum


class VisaStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    APPROVED = "approved"
    REJECTED = "rejected"
    READY_FOR_PICKUP = "ready_for_pickup"
    IN_TRANSIT = "in_transit"
    UNKNOWN = "unknown"


class VisaApplication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    application_number: str = Field(index=True, unique=True)
    country: str = Field(index=True)
    visa_type: str
    applicant_name: Optional[str] = None
    applicant_nationality: Optional[str] = None
    passport_number: Optional[str] = None
    submit_date: Optional[date] = None
    estimated_completion_date: Optional[date] = None
    status: VisaStatus = Field(default=VisaStatus.PENDING)
    status_details: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    extra_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))


class QueryCache(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    query_key: str = Field(index=True, unique=True)
    country: str = Field(index=True)
    application_number: str
    status: VisaStatus
    status_details: Optional[str] = None
    raw_response: Optional[str] = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentChecklist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    country: str = Field(index=True)
    visa_type: str = Field(index=True)
    nationality: Optional[str] = Field(index=True, default=None)
    checklist_data: Dict[str, Any] = Field(sa_column=Column(JSON))
    version: str = "1.0"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OCRRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    application_id: Optional[int] = Field(default=None, foreign_key="visaapplication.id")
    file_name: str
    file_path: str
    ocr_text: str
    extracted_fields: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
