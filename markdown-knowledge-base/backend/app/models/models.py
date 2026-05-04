from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


note_links = Table(
    'note_links',
    Base.metadata,
    Column('from_note_id', Integer, ForeignKey('notes.id'), primary_key=True),
    Column('to_note_id', Integer, ForeignKey('notes.id'), primary_key=True)
)


class Note(Base):
    __tablename__ = 'notes'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    file_path = Column(String(500), unique=True, index=True, nullable=False)
    content_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    outgoing_links = relationship(
        'Note',
        secondary=note_links,
        primaryjoin=id == note_links.c.from_note_id,
        secondaryjoin=id == note_links.c.to_note_id,
        backref='incoming_links'
    )
    
    def __repr__(self):
        return f"<Note(id={self.id}, title='{self.title}')>"
