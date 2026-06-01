from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, schemas
from datetime import datetime


def create_meeting(db: Session, meeting: schemas.MeetingCreate) -> models.Meeting:
    db_meeting = models.Meeting(
        title=meeting.title or f"会议 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def get_meeting(db: Session, meeting_id: int) -> Optional[models.Meeting]:
    return db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()


def get_meetings(db: Session, skip: int = 0, limit: int = 100) -> List[models.Meeting]:
    return (
        db.query(models.Meeting)
        .order_by(models.Meeting.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_meeting(
    db: Session, 
    meeting_id: int, 
    meeting_data: schemas.MeetingUpdate
) -> Optional[models.Meeting]:
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return None
    
    update_data = meeting_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meeting, key, value)
    
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def delete_meeting(db: Session, meeting_id: int) -> bool:
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return False
    db.delete(db_meeting)
    db.commit()
    return True


def create_audio_file(
    db: Session, 
    meeting_id: int, 
    filename: str, 
    file_path: str, 
    duration: Optional[int] = None
) -> models.AudioFile:
    db_audio = models.AudioFile(
        meeting_id=meeting_id,
        filename=filename,
        file_path=file_path,
        duration=duration,
    )
    db.add(db_audio)
    db.commit()
    db.refresh(db_audio)
    return db_audio
