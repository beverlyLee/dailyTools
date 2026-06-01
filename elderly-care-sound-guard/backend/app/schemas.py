from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class AlertLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SoundType(str, Enum):
    FALL = "fall"
    CRY = "cry"
    SCREAM = "scream"
    UNKNOWN = "unknown"

class AlertRequest(BaseModel):
    audio_data: Optional[str] = None
    audio_url: Optional[str] = None
    detected_sound: Optional[str] = None
    confidence: Optional[float] = None
    location: Optional[str] = None
    timestamp: Optional[str] = None

class Contact(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    relation: str = "primary"

class AlertResponse(BaseModel):
    status: str
    alert_id: str
    message: str
    level: AlertLevel
    contacts_notified: List[dict]

class AlertHistory(BaseModel):
    alert_id: str
    timestamp: str
    level: str
    sound_type: str
    message: str
    contacts: List[dict]
    resolved: bool = False

class SettingsUpdate(BaseModel):
    contacts: List[Contact]
    sensitivity: str = "medium"
    enable_auto_notification: bool = True
