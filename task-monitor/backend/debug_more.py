#!/usr/bin/env python3
import os
import json
import sqlite3

ws = os.path.expanduser("~/Library/Application Support/Trae CN/User/workspaceStorage")

main_db = None
max_history = 0
for item in os.listdir(ws):
    db = os.path.join(ws, item, "state.vscdb")
    if not os.path.exists(db):
        continue
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
    row = c.fetchone()
    if row:
        history = json.loads(row[0])
        if isinstance(history, list) and len(history) > max_history:
            max_history = len(history)
            main_db = db
    conn.close()

conn = sqlite3.connect(main_db)
c = conn.cursor()

print("=== 所有包含 'sessionRelation' 的键 ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%sessionRelation%' ORDER BY length(value) DESC")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

print("\n\n=== 查看 sessionRelation 相关键的内容 ===")
c.execute("SELECT key, value FROM ItemTable WHERE key LIKE '%sessionRelation%'")
for key, value in c.fetchall():
    print(f"\n--- {key} ---")
    try:
        data = json.loads(value)
        if isinstance(data, dict):
            print(f"  类型: dict, keys: {list(data.keys())[:10]}")
            # 看看第一个值的结构
            if data:
                first_key = list(data.keys())[0]
                first_val = data[first_key]
                print(f"  第一个条目: {first_key} -> {json.dumps(first_val, ensure_ascii=False)[:200]}")
        elif isinstance(data, list):
            print(f"  类型: list, length: {len(data)}")
            if data:
                print(f"  第一个条目: {json.dumps(data[0], ensure_ascii=False)[:200]}")
        else:
            print(f"  类型: {type(data).__name__}, 值: {str(data)[:200]}")
    except Exception as e:
        print(f"  解析失败: {e}")
        print(f"  原始内容前200字: {value[:200]}")

print("\n\n=== 搜索所有包含 'chat' 的键 ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%chat%' ORDER BY length(value) DESC LIMIT 20")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

print("\n\n=== 搜索所有包含 'ai-chat' 的键 ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%ai-chat%' ORDER BY length(value) DESC LIMIT 20")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

# 检查 turnsHeight 中的 session ID 是否在 icube_session_agent_map 中
print("\n\n=== turnsHeight 中的 session ID 分析 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
chat_store = json.loads(c.fetchone()[0])
turns_height = chat_store.get('state', {}).get('turnsHeight', {})
print(f"turnsHeight 条目数: {len(turns_height)}")

# 提取唯一的 session ID
session_ids_from_turns = set()
for key in turns_height.keys():
    parts = key.split('-')
    if len(parts) >= 2:
        sid = '-'.join(parts[:-1])
        session_ids_from_turns.add(sid)

print(f"唯一 session ID 数: {len(session_ids_from_turns)}")
print(f"前5个: {list(session_ids_from_turns)[:5]}")

# 检查是否在 icube_session_agent_map 中
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
session_map = json.loads(c.fetchone()[0])
map_ids = set(session_map.keys())
overlap = session_ids_from_turns & map_ids
print(f"\n与 icube_session_agent_map 交集: {len(overlap)}")
if overlap:
    print(f"交集中的示例: {list(overlap)[:5]}")

conn.close()
