from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
import json

from .config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class PhotoProject(Base):
    __tablename__ = "photo_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    original_path = Column(String(500), nullable=False)
    processed_path = Column(String(500), nullable=True)
    
    original_width = Column(Integer, nullable=True)
    original_height = Column(Integer, nullable=True)
    
    upscale_factor = Column(Integer, default=2)
    enable_inpainting = Column(Integer, default=0)
    enable_colorization = Column(Integer, default=0)
    
    status = Column(String(50), default="pending")
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    metadata_json = Column(Text, nullable=True)
    
    @property
    def metadata(self):
        if self.metadata_json:
            return json.loads(self.metadata_json)
        return {}
    
    @metadata.setter
    def metadata(self, value):
        self.metadata_json = json.dumps(value)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
