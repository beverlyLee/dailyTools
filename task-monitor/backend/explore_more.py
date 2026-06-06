#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import json
import os

db_path = "/Users/liboyang/Library/Application Support/Trae CN/User/workspaceStorage/3d50d7b6f6849bf3c94e1e20f0552318/state.vscdb"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== chat.ChatSessionStore.index ===")
cursor.execute("SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f"类型: {type(data)}")
    if isinstance(data, dict):
        print(f"键: {list(data.keys())[:10]}")
    elif isinstance(data, list):
        print(f"数量: {len(data)}")
        if data:
            print(f"第一项: {json.dumps(data[0], indent=2, ensure_ascii=False)[:500]}")

print()
print("=== sessionRelation:modeMap ===")
cursor.execute("SELECT value FROM ItemTable WHERE key = '4285224449222504_ai-chat:sessionRelation:modeMap'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f"数量: {len(data)}")
    items = list(data.items())[:3]
    for k, v in items:
        print(f"  {k}: {v}")

print()
print("=== sessionRelation:globalModeMap ===")
cursor.execute("SELECT value FROM ItemTable WHERE key = '4285224449222504_ai-chat:sessionRelation:globalModeMap'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f"数量: {len(data)}")

print()
print("=== currentAgentData ===")
cursor.execute("SELECT value FROM ItemTable WHERE key = 'currentAgentData_4285224449222504'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f"类型: {type(data)}")
    print(f"内容: {json.dumps(data, indent=2, ensure_ascii=False)[:1000]}")

print()
print("=== ChatStore 内容结构（精简）===")
cursor.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
row = cursor.fetchone()
if row:
    data = json.loads(row[0])
    print(f"顶级键: {list(data.keys())}")
    if 'state' in data:
        state = data['state']
        print(f"state 键: {list(state.keys())}")
        if 'sessionState' in state:
            print(f"sessionState 数量: {len(state['sessionState'])}")

conn.close()
