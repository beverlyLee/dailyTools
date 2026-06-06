#!/usr/bin/env python3
import os
import json
import sqlite3

# 探索 turnsHeight 中的 session，看看能否找到更多信息

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

# 获取 turnsHeight 中的 session
c.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
chat_store = json.loads(c.fetchone()[0])
turns_height = chat_store.get('state', {}).get('turnsHeight', {})
print(f"turnsHeight 条目数: {len(turns_height)}")

# 提取 session ID 和最大 turn 数
session_turns = {}
for key, height in turns_height.items():
    parts = key.rsplit('-', 1)
    if len(parts) == 2:
        sid = parts[0]
        turn_num = int(parts[1])
        if sid not in session_turns or turn_num > session_turns[sid]:
            session_turns[sid] = turn_num

print(f"唯一 session 数: {len(session_turns)}")

# 按 turn 数排序（turn 多的可能是活跃/重要的）
sorted_sessions = sorted(session_turns.items(), key=lambda x: x[1], reverse=True)
print(f"\nTop 10 sessions (by turns):")
for i, (sid, turns) in enumerate(sorted_sessions[:10]):
    print(f"  {i+1}. {sid}: {turns} turns")

# 检查这些 session 是否在 icube_session_agent_map 中
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
session_map = json.loads(c.fetchone()[0])
map_ids = set(session_map.keys())
overlap = set(session_turns.keys()) & map_ids
print(f"\n与 icube_session_agent_map 交集: {len(overlap)}")

# 检查这些 session 是否在 memento 中
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
storage = json.loads(c.fetchone()[0])
memento_ids = {s.get('sessionId') for s in storage.get('list', [])}
memento_overlap = set(session_turns.keys()) & memento_ids
print(f"与 memento storage 交集: {len(memento_overlap)}")

# 检查是否在 sandbox JSON 文件中
sandbox_path = os.path.expanduser("~/Library/Application Support/Trae CN/ModularData/ai-agent/sandbox")
sandbox_ids = set()
if os.path.exists(sandbox_path):
    for f in os.listdir(sandbox_path):
        if f.endswith('.json') and not f.endswith('-hooks.json'):
            sandbox_ids.add(f.replace('.json', ''))
sandbox_overlap = set(session_turns.keys()) & sandbox_ids
print(f"与 sandbox sessions 交集: {len(sandbox_overlap)}")

# 看看 turnsIsExpand 有没有用
turns_expand = chat_store.get('state', {}).get('turnsIsExpand', {})
print(f"\nturnsIsExpand 条目数: {len(turns_expand)}")
if turns_expand:
    sample_key = list(turns_expand.keys())[0]
    print(f"示例: {sample_key} -> {turns_expand[sample_key]}")

# 看看 diffCodeBlockStatus 有没有用
diff_status = chat_store.get('state', {}).get('diffCodeBlockStatus', {})
print(f"\ndiffCodeBlockStatus 条目数: {len(diff_status)}")
if diff_status:
    sample_key = list(diff_status.keys())[0]
    print(f"示例: {sample_key} -> {diff_status[sample_key]}")

# 搜索是否有其他键包含这些 session ID 的信息
print(f"\n\n搜索包含 session ID 的其他键...")
sample_sid = sorted_sessions[0][0]
print(f"搜索包含 '{sample_sid}' 的值...")
c.execute("SELECT key, value FROM ItemTable")
count = 0
for key, value in c.fetchall():
    if sample_sid in value:
        print(f"  {key}: 包含")
        count += 1
        if count >= 10:
            break
if count == 0:
    print("  没有找到其他包含该 session ID 的键")

conn.close()
