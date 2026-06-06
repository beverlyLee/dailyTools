#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import json
import os

db_path = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/state.vscdb")

print(f"数据库: {db_path}")
print(f"文件大小: {os.path.getsize(db_path) / 1024:.1f} KB")
print()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM ItemTable")
count = cursor.fetchone()[0]
print(f"总记录数: {count}")
print()

print("=== 所有与 ai/chat/session/message 相关的键 ===")
cursor.execute("""
    SELECT key FROM ItemTable 
    WHERE key LIKE '%ai%' 
       OR key LIKE '%chat%' 
       OR key LIKE '%session%' 
       OR key LIKE '%message%'
       OR key LIKE '%agent%'
    ORDER BY key
""")
keys = [row[0] for row in cursor.fetchall()]
print(f"找到 {len(keys)} 个相关键:")
for k in keys:
    print(f"  - {k}")

print()
print("=== storage.json 看看有没有线索 ===")
storage_json_path = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/storage.json")
if os.path.exists(storage_json_path):
    with open(storage_json_path, 'r') as f:
        data = json.load(f)
    print(f"顶级键数量: {len(data)}")
    ai_related = {k: v for k, v in data.items() if 'ai' in k.lower() or 'chat' in k.lower() or 'agent' in k.lower()}
    print(f"AI 相关的键: {list(ai_related.keys())[:20]}")

conn.close()
