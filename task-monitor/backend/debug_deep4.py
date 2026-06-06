#!/usr/bin/env python3
import os, json, sqlite3

# Check global storage Tencent-Cloud.coding-copilot
global_db = os.path.expanduser("~/Library/Application Support/Trae CN/User/globalStorage/state.vscdb")
conn = sqlite3.connect(global_db)
c = conn.cursor()

print("=== Global Tencent-Cloud.coding-copilot ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'Tencent-Cloud.coding-copilot'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f"Type: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())}")
        for k in data.keys():
            v = data[k]
            if isinstance(v, (dict, list)):
                print(f"\n  {k}: {type(v).__name__} of length {len(v)}")
                if isinstance(v, list) and len(v) > 0:
                    print(f"    First item keys: {list(v[0].keys()) if isinstance(v[0], dict) else type(v[0])}")
                    print(f"    First item: {str(v[0])[:300]}")
                elif isinstance(v, dict):
                    print(f"    Keys: {list(v.keys())[:20]}")
            else:
                print(f"  {k}: {str(v)[:200]}")

# Check all keys with "copilot"
print("\n\n=== All copilot keys in global storage ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%copilot%' ORDER BY length(value) DESC")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

# Check byted-icube.python-enhance - might have chat data
print("\n\n=== byted-icube.python-enhance ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'byted-icube.python-enhance'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print(f"Type: {type(data)}")
    if isinstance(data, dict):
        print(f"Keys: {list(data.keys())[:20]}")
        for k in list(data.keys())[:10]:
            v = data[k]
            v_str = str(v)[:200]
            print(f"  {k}: {v_str}")

# Check for any key that might have chat history
print("\n\n=== Searching for 'conversation' or 'chatHistory' ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE value LIKE '%conversation%' OR value LIKE '%chatHistory%' OR value LIKE '%chat_history%' ORDER BY length(value) DESC LIMIT 20")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

# Check ChatStore in workspace - it has 23KB
print("\n\n=== Workspace ChatStore (full) ===")
ws = os.path.expanduser("~/Library/Application Support/Trae CN/User/workspaceStorage")
main_db = None
for item in os.listdir(ws):
    db = os.path.join(ws, item, "state.vscdb")
    if not os.path.exists(db):
        continue
    conn2 = sqlite3.connect(db)
    c2 = conn2.cursor()
    c2.execute("SELECT value FROM ItemTable WHERE key = 'ChatStore'")
    row = c2.fetchone()
    if row and len(row[0]) > 10000:
        chat_store = json.loads(row[0])
        print(f"DB: {item}")
        print(f"Type: {type(chat_store)}")
        if isinstance(chat_store, dict):
            print(f"Keys: {list(chat_store.keys())}")
            state = chat_store.get('state', {})
            if isinstance(state, dict):
                print(f"state keys: {list(state.keys())}")
                for sk in state.keys():
                    sv = state[sk]
                    if isinstance(sv, (dict, list)):
                        print(f"  {sk}: {type(sv).__name__} of length {len(sv)}")
                        if isinstance(sv, dict):
                            print(f"    Sample keys: {list(sv.keys())[:5]}")
                        elif isinstance(sv, list) and len(sv) > 0:
                            print(f"    First: {str(sv[0])[:200]}")
                    else:
                        print(f"  {sk}: {str(sv)[:100]}")
        conn2.close()
        break
    conn2.close()

conn.close()

# Look for any .json files that might contain chat data
print("\n\n=== Looking for chat JSON files ===")
app_support = os.path.expanduser("~/Library/Application Support")
for root, dirs, files in os.walk(app_support):
    # Only check Trae-related dirs
    if 'Trae' not in root and 'trae' not in root:
        continue
    for f in files:
        if f.endswith('.json') and ('chat' in f.lower() or 'message' in f.lower() or 'session' in f.lower()):
            full_path = os.path.join(root, f)
            try:
                size = os.path.getsize(full_path)
                if size > 1024:  # > 1KB
                    print(f"  {full_path}: {size} bytes")
            except:
                pass
