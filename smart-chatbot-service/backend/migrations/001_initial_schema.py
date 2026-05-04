"""
初始数据库迁移脚本
创建对话和消息表
"""
import asyncio
import sys
import os

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from app.database import Base
from app.config import get_settings

async def run_migration():
    settings = get_settings()
    
    # 创建引擎
    engine = create_async_engine(
        settings.database_url,
        echo=True,
    )
    
    # 创建所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("数据库迁移完成：已创建所有表")
    
    # 关闭引擎
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
