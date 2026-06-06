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

print("=== chat.ChatSessionStore.index ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index'")
row = c.fetchone()
if row:
    print(f"值: {row[0]}")
    print(f"长度: {len(row[0])}")

print("\n\n=== ChatStore 完整结构 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
chat_store = json.loads(c.fetchone()[0])
state = chat_store.get('state', {})
print(f"state keys: {list(state.keys())}")
print()

for k, v in state.items():
    if isinstance(v, dict):
        print(f"{k}: dict (len={len(v)})")
    elif isinstance(v, list):
        print(f"{k}: list (len={len(v)})")
    else:
        print(f"{k}: {type(v).__name__} = {str(v)[:100]}")

# 看看 expanded 里有什么
expanded = state.get('expanded', {})
print(f"\n\nexpanded 示例 (前5个):")
for i, (k, v) in enumerate(list(expanded.items())[:5]):
    print(f"  {k}: {v}")

# 看看 activeChatSession 或类似的
print(f"\n\n搜索包含 'session' 的 state 键:")
for k in state.keys():
    if 'session' in k.lower():
        print(f"  {k}")

# 检查 turnsHeight 的 session ID 长度
turns_height = state.get('turnsHeight', {})
sample_keys = list(turns_height.keys())[:5]
print(f"\n\nturnsHeight 中的 key 样例:")
for k in sample_keys:
    parts = k.split('-')
    print(f"  {k} -> parts={len(parts)}, first={parts[0]} (len={len(parts[0])})")

# 看看这些 session ID 是不是另一种格式
print(f"\n\n检查 turnsHeight 中 session ID 的格式:")
session_ids = set()
for key in turns_height.keys():
    parts = key.split('-')
    if len(parts) >= 2:
        sid = '-'.join(parts[:-1])
        session_ids.add(sid)

print(f"唯一 session ID 数: {len(session_ids)}")
sample = list(session_ids)[:10]
for sid in sample:
    print(f"  {sid} (len={len(sid)})")

# 检查 memento/icube-ai-agent-storage 中 session ID 的长度
print(f"\n\nmemento/icube-ai-agent-storage 中 session ID 长度:")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
storage = json.loads(c.fetchone()[0])
slist = storage.get('list', [])
for s in slist[:5]:
    sid = s.get('sessionId')
    print(f"  {sid} (len={len(sid)})")

# 检查 icube_session_agent_map 中 session ID 的长度
print(f"\n\nicube_session_agent_map 中 session ID 长度:")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
session_map = json.loads(c.fetchone()[0])
sample_keys = list(session_map.keys())[:5]
for sid in sample_keys:
    print(f"  {sid} (len={len(sid)})")

conn.close()
