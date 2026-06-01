#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import json
import os

db_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/User/workspaceStorage/e04cdd/state.vscdb")

print(f"检查数据库: {db_path}")
print(f"文件大小: {os.path.getsize(db_path)} bytes")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查看所有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"\n表列表: {tables}")
    
    for table in tables:
        table_name = table[0]
        print(f"\n{'=' * 60}")
        print(f"表: {table_name}")
        print('=' * 60)
        
        # 查看表结构
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"列: {[c[1] for c in columns]}")
        
        # 查看数据条数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"数据条数: {count}")
        
        # 查看所有键（如果是键值表）
        if 'key' in [c[1] for c in columns]:
            cursor.execute(f"SELECT key FROM {table_name} LIMIT 50")
            keys = cursor.fetchall()
            print(f"\n键列表 (前50个):")
            for k in keys:
                print(f"  - {k[0]}")
            
            # 查找任务相关的键
            print(f"\n任务相关的键:")
            for k in keys:
                key_name = k[0].lower()
                if any(kw in key_name for kw in ['task', 'solo', 'conversation', 'chat', 'agent', '任务', '会话']):
                    print(f"  ✓ {k[0]}")
                    
                    # 获取值
                    cursor.execute(f"SELECT value FROM {table_name} WHERE key = ?", (k[0],))
                    value = cursor.fetchone()[0]
                    print(f"    值 (前500字符): {value[:500]}")
                    
                    # 尝试解析 JSON
                    try:
                        value_json = json.loads(value)
                        print(f"    解析为 JSON (前1000字符):")
                        print(json.dumps(value_json, indent=2, ensure_ascii=False)[:1000])
                    except:
                        pass
    
    conn.close()
    
except Exception as e:
    print(f"错误: {e}")
