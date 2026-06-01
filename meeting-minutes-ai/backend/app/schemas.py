from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ActionItem(BaseModel):
    task: str
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = "medium"


class MeetingBase(BaseModel):
    title: Optional[str] = None
    transcription: Optional[str] = None
    summary: Optional[str] = None
    topic: Optional[str] = None
    decisions: Optional[List[str]] = []
    action_items: Optional[List[Dict[str, Any]]] = []


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(MeetingBase):
    pass


class MeetingResponse(MeetingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TranscribeRequest(BaseModel):
    meeting_id: int


class TextTranscribeRequest(BaseModel):
    meeting_id: int
    transcription_text: str


class ProcessMeetingRequest(BaseModel):
    meeting_id: int
    transcription_text: str = ""


class TranscribeResponse(BaseModel):
    transcription: str


class SummaryRequest(BaseModel):
    meeting_id: int


class SummaryResponse(BaseModel):
    summary: str
    topic: str
    decisions: List[str]
    action_items: List[Dict[str, Any]]


class SettingsTestRequest(BaseModel):
    api_key: str
    base_url: str
    model: str


class SettingsTestResponse(BaseModel):
    success: bool
    message: str
