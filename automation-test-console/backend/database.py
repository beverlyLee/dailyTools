from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, Float
from datetime import datetime

DATABASE_URL = "sqlite+aiosqlite:///./test_automation.db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class UITestCase(Base):
    __tablename__ = "ui_test_cases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    steps = Column(JSON, nullable=False)
    assertions = Column(JSON, nullable=True)
    target_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)


class APITestCase(Base):
    __tablename__ = "api_test_cases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    path = Column(String(500), nullable=False)
    headers = Column(JSON, nullable=True)
    body = Column(JSON, nullable=True)
    expected_status = Column(Integer, default=200)
    expected_response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)


class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    task_type = Column(String(20), nullable=False)
    test_cases = Column(JSON, nullable=True)
    environment = Column(String(50), default="test")
    schedule_type = Column(String(20), default="once")
    cron_expression = Column(String(100), nullable=True)
    interval = Column(Integer, nullable=True)
    interval_unit = Column(String(20), nullable=True)
    enabled = Column(Boolean, default=True)
    notify_on_success = Column(Boolean, default=False)
    notify_on_failure = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)


class TestReport(Base):
    __tablename__ = "test_reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    report_type = Column(String(20), nullable=False)
    environment = Column(String(50), nullable=False)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    skipped_tests = Column(Integer, default=0)
    duration = Column(Float, default=0.0)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EnvironmentConfig(Base):
    __tablename__ = "environment_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    base_url = Column(String(500), nullable=False)
    variables = Column(JSON, nullable=True)
    status = Column(String(20), default="正常")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with async_session_maker() as session:
        yield session
