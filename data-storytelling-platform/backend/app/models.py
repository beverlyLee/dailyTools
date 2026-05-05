from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Parameter(BaseModel):
    id: str
    name: str
    type: str
    label: str
    value: Any
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    options: Optional[List[Dict[str, str]]] = None

class SlideElement(BaseModel):
    id: str
    type: str
    content: str
    style: Dict[str, Any] = Field(default_factory=dict)
    dataSource: Optional[str] = None

class Slide(BaseModel):
    id: str
    title: str
    elements: List[SlideElement] = Field(default_factory=list)
    parameters: List[Parameter] = Field(default_factory=list)

class Story(BaseModel):
    id: str
    title: str
    description: str = ""
    slides: List[Slide] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class StoryCreate(BaseModel):
    title: str
    description: str = ""

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    slides: Optional[List[Slide]] = None

class ReportTemplate(BaseModel):
    id: str
    name: str
    description: str = ""
    parameters: List[Parameter] = Field(default_factory=list)
    content: str = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class ReportTemplateCreate(BaseModel):
    name: str
    description: str = ""

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[List[Parameter]] = None
    content: Optional[str] = None

class ReportSchedule(BaseModel):
    id: str
    templateId: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    emailRecipients: List[str] = Field(default_factory=list)
    schedule: str
    format: str
    enabled: bool = True

class ReportScheduleCreate(BaseModel):
    templateId: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    emailRecipients: List[str] = Field(default_factory=list)
    schedule: str
    format: str

class ReportScheduleUpdate(BaseModel):
    parameters: Optional[Dict[str, Any]] = None
    emailRecipients: Optional[List[str]] = None
    schedule: Optional[str] = None
    format: Optional[str] = None
    enabled: Optional[bool] = None

class GeneratedReport(BaseModel):
    id: str
    templateId: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    format: str
    downloadUrl: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class GenerateReportRequest(BaseModel):
    templateId: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    format: str = "html"
