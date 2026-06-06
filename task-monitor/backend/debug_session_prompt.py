#!/usr/bin/env python3
import os
import json
import sqlite3

# 目标：找到真实 session ID 和 prompt 的关联方式

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

# 1. 检查 input-history 的完整结构
print("=== input-history 条目结构 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
history = json.loads(c.fetchone()[0])
print(f"Total entries: {len(history)}")
print(f"First entry keys: {list(history[0].keys())}")
print(f"Full first entry: {json.dumps(history[0], ensure_ascii=False, indent=2)[:1500]}")

# 2. 检查 icube_session_agent_map
print("\n\n=== icube_session_agent_map (前10个) ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
session_map = json.loads(c.fetchone()[0])
print(f"Total sessions: {len(session_map)}")
for i, (sid, agent) in enumerate(list(session_map.items())[:10]):
    print(f"  {sid}: {agent}")

# 3. 检查 memento/icube-ai-agent-storage 中的 messages
print("\n\n=== memento/icube-ai-agent-storage ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
storage = json.loads(c.fetchone()[0])
slist = storage.get('list', [])
print(f"Total sessions in storage: {len(slist)}")
for i, s in enumerate(slist[:5]):
    print(f"  {i}: sessionId={s.get('sessionId')}, messages={len(s.get('messages', []))}")
    if s.get('messages'):
        print(f"    First message: {json.dumps(s['messages'][0], ensure_ascii=False)[:300]}")

# 4. 检查是否有其他键可以关联 session 和 input
print("\n\n=== 搜索包含 sessionId 的输入历史条目 ===")
# 用第一个真实 session ID 搜索
first_real_sid = list(session_map.keys())[0]
print(f"搜索 session ID: {first_real_sid}")
found = False
for i, item in enumerate(history):
    text = item.get('inputText', '')
    if first_real_sid in text:
        print(f"  Found in entry {i}: {text[:200]}")
        found = True
        break
if not found:
    print("  未在 inputText 中找到")

# 5. 检查 input-history 是否有 session ID 相关字段
print("\n\n=== 检查 input-history 条目的所有字段 ===")
for i, item in enumerate(history[:3]):
    print(f"\nEntry {i}:")
    for k, v in item.items():
        if isinstance(v, (str, int, float, bool)):
            print(f"  {k}: {str(v)[:100]}")
        else:
            print(f"  {k}: {type(v).__name__} - {json.dumps(v, ensure_ascii=False)[:200]}")

conn.close()
