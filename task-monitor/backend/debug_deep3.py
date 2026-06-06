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

slist = storage.get('list', [])
print(f"list length: {len(slist)}")

for i, item in enumerate(slist[:3]):
    if isinstance(item, dict):
        print(f"\n  [{i}] keys: {list(item.keys())}")
        for k, v in item.items():
            if k == 'messages':
                print(f"    {k}: {len(v)} items (empty list = {len(v) == 0})")
            else:
                v_str = str(v)[:150]
                print(f"    {k}: {v_str}")

# Check if input-history has any session association
print("\n\n=== Input history - session association? ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
history = json.loads(c.fetchone()[0])
print(f"Total entries: {len(history)}")

# Check if any entry has sessionId or similar
for i, entry in enumerate(history[:10]):
    keys = list(entry.keys())
    if len(keys) > 3 or 'session' in str(keys).lower():
        print(f"\n  [{i}] keys: {keys}")
        for k, v in entry.items():
            v_str = str(v)[:100]
            print(f"    {k}: {v_str}")

# Check all keys in detail - look for message content anywhere
print("\n\n=== All keys with large values (>1KB) ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE length(value) > 1024 ORDER BY length(value) DESC")
for k, size in c.fetchall():
    if 'input-history' in k or 'memento' in k or 'history' in k.lower():
        continue
    print(f"  {k}: {size} bytes")

# Check Tencent-Cloud.coding-copilot
print("\n\n=== Tencent-Cloud.coding-copilot ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'Tencent-Cloud.coding-copilot'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())[:30]}")
        # Look for chat/conversation/message keys
        for k in list(data.keys()):
            if 'chat' in k.lower() or 'message' in k.lower() or 'conversation' in k.lower() or 'session' in k.lower():
                v = data[k]
                v_str = str(v)[:200]
                print(f"  {k}: {v_str}")

conn.close()

# Check global storage
print("\n\n=== Global Storage state.vscdb ===")
global_db = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/state.vscdb")
if os.path.exists(global_db):
    conn2 = sqlite3.connect(global_db)
    c2 = conn2.cursor()
    
    c2.execute("SELECT COUNT(*) FROM ItemTable")
    print(f"Total entries: {c2.fetchone()[0]}")
    
    # Search for chat/message related keys
    c2.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%chat%' OR key LIKE '%message%' OR key LIKE '%session%' OR key LIKE '%ai%' ORDER BY length(value) DESC LIMIT 30")
    rows = c2.fetchall()
    print(f"\nChat/message/session keys ({len(rows)}):")
    for k, size in rows:
        print(f"  {k}: {size} bytes")
    
    # Show all large values
    c2.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 30")
    rows = c2.fetchall()
    print(f"\nTop 30 largest values:")
    for k, size in rows:
        print(f"  {k}: {size} bytes")
    
    # Check saoudrizwan.claude-dev state - it might have a similar structure
    state_path = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/saoudrizwan.claude-dev/state")
    if os.path.exists(state_path):
        print(f"\n\n=== saoudrizwan.claude-dev/state ===")
        with open(state_path, 'r') as f:
            state = json.load(f)
        print(f"Type: {type(state)}")
        if isinstance(state, dict):
            print(f"Keys: {list(state.keys())[:20]}")
            for k in list(state.keys())[:10]:
                v = state[k]
                v_str = str(v)[:200]
                print(f"  {k}: {v_str}")
    
    conn2.close()
else:
    print("Global state.vscdb not found")

# Also check TRAE SOLO CN
print("\n\n=== TRAE SOLO CN - workspaceStorage ===")
solo_ws = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/User/workspaceStorage")
if os.path.exists(solo_ws):
    for item in os.listdir(solo_ws)[:5]:
        db = os.path.join(solo_ws, item, "state.vscdb")
        if os.path.exists(db):
            conn3 = sqlite3.connect(db)
            c3 = conn3.cursor()
            c3.execute("SELECT COUNT(*) FROM ItemTable")
            count = c3.fetchone()[0]
            print(f"  {item}: {count} entries")
            
            # Check for large values
            c3.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 10")
            rows = c3.fetchall()
            for k, size in rows:
                print(f"    {k}: {size} bytes")
            conn3.close()
            break
