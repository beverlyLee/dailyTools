#!/usr/bin/env python3
import os
import json
import sqlite3

# 目标：找到真实 chat session ID 对应的 prompt

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

# 1. 检查 memento/icube-ai-agent-storage 的完整结构
print("=== memento/icube-ai-agent-storage 详情 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
storage = json.loads(c.fetchone()[0])
print(f"Storage keys: {list(storage.keys())}")
slist = storage.get('list', [])
print(f"List length: {len(slist)}")
print(f"currentSessionId: {storage.get('currentSessionId')}")

if slist:
    print("\n前3个 session 详情:")
    for i, s in enumerate(slist[:3]):
        print(f"\n  Session {i}:")
        for k, v in s.items():
            if isinstance(v, list):
                print(f"    {k}: list (len={len(v)})")
                if v and isinstance(v[0], dict):
                    print(f"      first item keys: {list(v[0].keys())}")
            else:
                print(f"    {k}: {str(v)[:200]}")

# 2. 检查 icube_session_agent_map 中的 session 是否在 storage 中
print("\n\n=== 检查 session 映射 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
session_map = json.loads(c.fetchone()[0])
storage_sids = {s.get('sessionId') for s in slist}
map_sids = set(session_map.keys())

print(f"session_map 中 session 数: {len(map_sids)}")
print(f"storage list 中 session 数: {len(storage_sids)}")
print(f"交集: {len(map_sids & storage_sids)}")
print(f"session_map 有但 storage 没有: {len(map_sids - storage_sids)}")
print(f"storage 有但 session_map 没有: {len(storage_sids - map_sids)}")

# 3. 检查是否有其他键包含 chat 消息
print("\n\n=== 搜索所有包含 'sessionId' 的值 ===")
c.execute("SELECT key, value FROM ItemTable")
for key, value in c.fetchall():
    try:
        if 'sessionId' in value or 'session_id' in value:
            # 简单检查
            if len(value) < 5000:
                data = json.loads(value)
                if isinstance(data, dict) and 'sessionId' in data:
                    print(f"  {key}: has sessionId = {data['sessionId']}")
                elif isinstance(data, list) and len(data) > 0:
                    if isinstance(data[0], dict) and 'sessionId' in data[0]:
                        print(f"  {key}: list with sessionId (len={len(data)})")
    except:
        pass

# 4. 看看 ChatStore 中的 turnsHeight 能否提供线索
print("\n\n=== ChatStore turnsHeight 分析 ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
chat_store = json.loads(c.fetchone()[0])
state = chat_store.get('state', {})
turns_height = state.get('turnsHeight', {})
print(f"turnsHeight 条目数: {len(turns_height)}")
# 看看 key 的格式
sample_keys = list(turns_height.keys())[:5]
print(f"示例 keys: {sample_keys}")
# 分析 key 格式
for k in sample_keys[:3]:
    parts = k.split('-')
    print(f"  {k}: parts={parts}")

# 5. 检查 sessionRelation 数据
print("\n\n=== sessionRelation:modelMap 分析 ===")
c.execute("SELECT value FROM ItemTable WHERE key LIKE '%sessionRelation:modelMap%'")
row = c.fetchone()
if row:
    rel_map = json.loads(row[0])
    print(f"条目数: {len(rel_map)}")
    sample_keys = list(rel_map.keys())[:5]
    print(f"示例 keys: {sample_keys}")
    for k in sample_keys[:3]:
        print(f"  {k}: {rel_map[k]}")

# 检查是否和 icube_session_agent_map 一致
print(f"\n与 icube_session_agent_map 的 key 交集: {len(set(rel_map.keys()) & set(session_map.keys()))}")

conn.close()
