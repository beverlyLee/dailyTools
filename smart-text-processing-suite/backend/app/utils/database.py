from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config.settings import settings


mysql_engine = create_async_engine(
    settings.MYSQL_DATABASE_URL,
    echo=True,
    pool_pre_ping=True
)

mysql_sessionmaker = async_sessionmaker(
    mysql_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


sqlite_engine = create_async_engine(
    settings.SQLITE_DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False}
)

sqlite_sessionmaker = async_sessionmaker(
    sqlite_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_mysql_session():
    async with mysql_sessionmaker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_sqlite_session():
    async with sqlite_sessionmaker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_mysql_tables():
    async with mysql_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def init_sqlite_tables():
    async with sqlite_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
