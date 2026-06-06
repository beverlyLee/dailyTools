#!/usr/bin/env python3
import os, json, sqlite3

ws = os.path.expanduser("~/Library/Application Support/Trae CN/User/workspaceStorage")

main_db = None
for item in os.listdir(ws):
    db = os.path.join(ws, item, "state.vscdb")
    if not os.path.exists(db):
        continue
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
    row = c.fetchone()
    if row and len(json.loads(row[0])) > 500:
        main_db = db
        break
    conn.close()

conn = sqlite3.connect(main_db)
c = conn.cursor()

# Deep dive into memento/icube-ai-agent-storage
print("=== memento/icube-ai-agent-storage (list) ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
storage = json.loads(c.fetchone()[0])
print(f"Keys: {list(storage.keys())}")
print(f"currentSessionId: {storage.get('currentSessionId')}")

slist = storage.get('list', [])
print(f"\nlist length: {len(slist)}")
if slist:
    first = slist[0]
    print(f"First item type: {type(first)}")
    if isinstance(first, dict):
        print(f"First item keys: {list(first.keys())}")
        for k, v in first.items():
            v_str = str(v)[:200]
            print(f"  {k}: {v_str}")
    
    # Check if there's a messages field
    for i, item in enumerate(slist[:5]):
        if isinstance(item, dict) and 'messages' in item:
            print(f"\n  [{i}] has {len(item['messages'])} messages")
            print(f"    First message: {str(item['messages'][0])[:200]}")
        elif isinstance(item, dict) and 'message' in item:
            print(f"\n  [{i}] has message field: {str(item['message'])[:200]}")

# Check input-history-query
print("\n\n=== icube-ai-agent-storage-input-history-query ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history-query'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f"Type: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())[:20]}")
    elif isinstance(data, list):
        print(f"Length: {len(data)}")
        print(f"First: {str(data[0])[:200]}")

# Check 4285224449222504_ai-chat:sessionRelation:modelMap
print("\n\n=== sessionRelation:modelMap ===")
c.execute("SELECT value FROM ItemTable WHERE key = '4285224449222504_ai-chat:sessionRelation:modelMap'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f"Type: {type(data)}, length: {len(data)}")
    if isinstance(data, dict):
        # Check if it maps session to chat
        for k, v in list(data.items())[:5]:
            print(f"  {k}: {str(v)[:100]}")

# Check all keys with "4285224449222504" prefix (chat ID)
print("\n\n=== All 4285224449222504_* keys ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '4285224449222504_%' ORDER BY key")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

# Check if there are session-specific keys
print("\n\n=== Looking for session-specific data ===")
# Use a known session ID from agent_map
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
agent_map = json.loads(c.fetchone()[0])
sample_sid = list(agent_map.keys())[0]
print(f"Sample session ID: {sample_sid}")

# Search for keys containing this session
c.execute("SELECT key, length(value) FROM ItemTable WHERE value LIKE ? ORDER BY length(value) DESC", (f'%{sample_sid}%',))
rows = c.fetchall()
print(f"\nKeys containing session ID ({len(rows)}):")
for k, size in rows[:20]:
    print(f"  {k}: {size} bytes")

# Check Tencent-Cloud.coding-copilot - might have chat data
print("\n\n=== Tencent-Cloud.coding-copilot ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'Tencent-Cloud.coding-copilot'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f"Type: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())[:20]}")
        for k in list(data.keys())[:10]:
            v = data[k]
            v_str = str(v)[:150]
            print(f"  {k}: {v_str}")

conn.close()

# Check global storage state.vscdb
print("\n\n=== Global Storage state.vscdb ===")
global_db = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/state.vscdb")
if os.path.exists(global_db):
    conn2 = sqlite3.connect(global_db)
    c2 = conn2.cursor()
    c2.execute("SELECT COUNT(*) FROM ItemTable")
    print(f"Total entries: {c2.fetchone()[0]}")
    
    c2.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%chat%' OR key LIKE '%message%' OR key LIKE '%ai%' ORDER BY length(value) DESC LIMIT 20")
    rows = c2.fetchall()
    print(f"\nChat/AI related keys ({len(rows)}):")
    for k, size in rows:
        print(f"  {k}: {size} bytes")
    
    # Check saoudrizwan.claude-dev - might have similar structure
    c2.execute("SELECT key FROM ItemTable WHERE key LIKE 'saoudrizwan.claude-dev%'")
    rows = c2.fetchall()
    if rows:
        print(f"\nsaoudrizwan.claude-dev keys ({len(rows)}):")
        for k in rows:
            print(f"  {k[0]}")
    
    conn2.close()
