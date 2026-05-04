#!/usr/bin/env python3
"""
数据库初始化脚本
运行此脚本以初始化SQLite数据库表
"""

import os
import sys
from pathlib import Path

# 添加当前目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.database import init_db, engine, Base
from app.models.dialogue import DialogueHistory, NPCMemory, KnowledgeBase

def init_database():
    """初始化数据库"""
    print("正在初始化数据库...")
    
    # 确保data目录存在
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # 创建所有表
    init_db()
    
    print("数据库表创建成功！")
    print("\n已创建的表：")
    for table in Base.metadata.tables.keys():
        print(f"  - {table}")
    
    print("\n数据库初始化完成！")
    
    # 检查数据库文件
    db_file = Path(__file__).parent / "data" / "npc_dialogue.db"
    if db_file.exists():
        print(f"\n数据库文件位置: {db_file}")
        print(f"数据库文件大小: {db_file.stat().st_size} 字节")

if __name__ == "__main__":
    init_database()
