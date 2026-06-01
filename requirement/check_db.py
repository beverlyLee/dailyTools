#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import sqlite3
from pathlib import Path

db_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/database.db")

print(f"检查文件: {db_path}")
print(f"文件大小: {os.path.getsize(db_path)} bytes")

# 检查文件头
with open(db_path, 'rb') as f:
    header = f.read(100)
    print(f"文件头: {header[:50]}")

# 尝试 JSON
try:
    with open(db_path, 'r', encoding='utf-8', errors='ignore') as f:
        data = json.load(f)
    print("是 JSON 文件")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])
except:
    pass

# 尝试 sqlite3
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"是 SQLite 数据库，表: {tables}")
    
    for table in tables:
        table_name = table[0]
        print(f"\n--- 表: {table_name} ---")
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"列: {[c[1] for c in columns]}")
        
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
        rows = cursor.fetchall()
        for row in rows:
            print(f"  {row}")
    
    conn.close()
except Exception as e:
    print(f"SQLite 错误: {e}")

# 检查其他可能的数据库
other_dbs = [
    "~/Library/Application Support/TRAE SOLO CN/ModularData/ckg_server/env_codekg.db",
    "~/Library/Application Support/TRAE SOLO CN/User/globalStorage/storage.json",
    "~/Library/Application Support/TRAE SOLO CN/Local Storage/config.db",
]

for db in other_dbs:
    path = os.path.expanduser(db)
    if os.path.exists(path):
        print(f"\n\n检查: {path}")
        print(f"大小: {os.path.getsize(path)} bytes")
        
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            print(f"表: {tables}")
            conn.close()
        except:
            pass
