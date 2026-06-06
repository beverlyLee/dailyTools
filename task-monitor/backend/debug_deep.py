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

# Deep dive into input history
print("=== Input History Deep Dive ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
history = json.loads(c.fetchone()[0])
print(f"Total entries: {len(history)}")

# Check structure of entries
print(f"\nFirst entry keys: {list(history[0].keys()) if history else 'empty'}")
print(f"\nFirst 3 entries:")
for i, entry in enumerate(history[:3]):
    print(f"\n  [{i}]:")
    for k, v in entry.items():
        v_str = str(v)[:150]
        print(f"    {k}: {v_str}")

# Check icube_session_agent_map in detail
print("\n\n=== icube_session_agent_map ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
agent_map = json.loads(c.fetchone()[0])
print(f"Total sessions: {len(agent_map)}")

# Check structure
first_key = list(agent_map.keys())[0]
first_val = agent_map[first_key]
print(f"\nSession ID: {first_key}")
print(f"Value type: {type(first_val)}")
if isinstance(first_val, dict):
    print(f"Keys: {list(first_val.keys())}")
    for k, v in first_val.items():
        print(f"  {k}: {str(v)[:100]}")

# Check if there's a messages field in agent storage
print("\n\n=== memento/icube-ai-agent-storage ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
row = c.fetchone()
if row:
    storage = json.loads(row[0])
    print(f"Type: {type(storage)}")
    if isinstance(storage, dict):
        print(f"Keys: {list(storage.keys())[:20]}")
        for k in list(storage.keys())[:5]:
            v = storage[k]
            if isinstance(v, dict):
                print(f"\n  {k}:")
                print(f"    Keys: {list(v.keys())}")
                for kk in list(v.keys())[:10]:
                    vv = v[kk]
                    vv_str = str(vv)[:100]
                    print(f"    {kk}: {vv_str}")

# Look for LevelDB files
print("\n\n=== Looking for LevelDB / other data files ===")
for item in os.listdir(ws):
    item_path = os.path.join(ws, item)
    if os.path.isdir(item_path):
        files = os.listdir(item_path)
        db_files = [f for f in files if f.endswith('.db') or 'leveldb' in f.lower() or 'lmdb' in f.lower()]
        if db_files:
            print(f"  {item}: {db_files}")
        
        # Check for subdirectories
        subdirs = [f for f in files if os.path.isdir(os.path.join(item_path, f))]
        if subdirs:
            print(f"  {item} subdirs: {subdirs}")

# Also check global storage
global_storage = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage")
if os.path.exists(global_storage):
    print(f"\n\n=== Global Storage ===")
    for item in os.listdir(global_storage)[:30]:
        item_path = os.path.join(global_storage, item)
        if os.path.isdir(item_path):
            try:
                files = os.listdir(item_path)
                print(f"  {item}/: {len(files)} files")
                for f in files[:5]:
                    print(f"    {f}")
            except:
                pass
        else:
            print(f"  {item}")

conn.close()
