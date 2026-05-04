from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(DATA_DIR, "celebrity_face.db")}')
ASYNC_DATABASE_URL = os.getenv('ASYNC_DATABASE_URL', f'sqlite+aiosqlite:///{os.path.join(DATA_DIR, "celebrity_face.db")}')

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def init_db():
    Base.metadata.create_all(bind=engine)
