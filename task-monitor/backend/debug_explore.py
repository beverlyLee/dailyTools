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

print('=== icube_session_agent_map ===')
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f'Type: {type(data)}')
    if isinstance(data, dict):
        print(f'Keys count: {len(data)}')
        for i, (k, v) in enumerate(list(data.items())[:3]):
            print(f'  {k}: {json.dumps(v, ensure_ascii=False)[:300]}')
    elif isinstance(data, list):
        print(f'Length: {len(data)}')
        print(f'First item: {json.dumps(data[0], ensure_ascii=False)[:300]}')

print('\n\n=== ChatStore ===')
c.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f'Type: {type(data)}')
    if isinstance(data, dict):
        print(f'Keys: {list(data.keys())}')
        for k in data.keys():
            v = data[k]
            print(f'  {k}: type={type(v).__name__}')
            if isinstance(v, (dict, list)):
                print(f'    sample: {json.dumps(v, ensure_ascii=False)[:500]}')

print('\n\n=== sessionRelation:modelMap ===')
c.execute("SELECT value FROM ItemTable WHERE key LIKE '%sessionRelation:modelMap%'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f'Type: {type(data)}')
    if isinstance(data, dict):
        print(f'Keys count: {len(data)}')
        for i, (k, v) in enumerate(list(data.items())[:5]):
            print(f'  {k}: {json.dumps(v, ensure_ascii=False)[:300]}')

print('\n\n=== currentAgentData ===')
c.execute("SELECT value FROM ItemTable WHERE key LIKE '%currentAgentData%'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f'Type: {type(data)}')
    print(f'Content: {json.dumps(data, ensure_ascii=False, indent=2)[:2000]}')

conn.close()
