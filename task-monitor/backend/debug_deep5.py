#!/usr/bin/env python3
import os, json, sqlite3, glob

# Search for LevelDB / other database files
print("=== Searching for database files ===")
app_support = os.path.expanduser("~/Library/Application Support")

for root, dirs, files in os.walk(app_support):
    if 'Trae' not in root and 'trae' not in root:
        continue
    for f in files:
        if f.endswith(('.ldb', '.leveldb', '.sdb', '.rdb', '.mdb', '.db')):
            full_path = os.path.join(root, f)
            try:
                size = os.path.getsize(full_path)
                print(f"  {full_path}: {size} bytes")
            except:
                pass

# Check if there's a "logs" or "Cache" directory
print("\n\n=== Looking for cache / log directories ===")
for root, dirs, files in os.walk(app_support):
    if 'Trae' not in root and 'trae' not in root:
        continue
    for d in dirs:
        if d.lower() in ('cache', 'logs', 'IndexedDB', 'databases', 'storage'):
            full_path = os.path.join(root, d)
            try:
                contents = os.listdir(full_path)
                print(f"  {full_path}: {len(contents)} items")
                for item in contents[:10]:
                    print(f"    {item}")
            except:
                pass

# Check TRAE SOLO CN data
print("\n\n=== TRAE SOLO CN - deep dive ===")
solo_ws = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/User/workspaceStorage")
if os.path.exists(solo_ws):
    for item in os.listdir(solo_ws):
        db = os.path.join(solo_ws, item, "state.vscdb")
        if not os.path.exists(db):
            continue
        conn = sqlite3.connect(db)
        c = conn.cursor()
        
        # Check for input history
        c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
        row = c.fetchone()
        if not row:
            conn.close()
            continue
        
        history = json.loads(row[0])
        if len(history) < 50:
            conn.close()
            continue
        
        print(f"DB: {item}, input history: {len(history)} entries")
        
        # Check all large values
        c.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 20")
        rows = c.fetchall()
        print("  Top 20 largest values:")
        for k, size in rows:
            print(f"    {k}: {size} bytes")
        
        # Check memento/icube-ai-agent-storage
        c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
        row2 = c.fetchone()
        if row2:
            storage = json.loads(row2[0])
            slist = storage.get('list', [])
            print(f"\n  Agent sessions: {len(slist)}")
            if slist:
                first = slist[0]
                print(f"  First session keys: {list(first.keys())}")
                if 'messages' in first:
                    print(f"  Messages count: {len(first['messages'])}")
        
        conn.close()
        break

# Try to find chat messages by searching for known text in input history
print("\n\n=== Trying to find message storage by content search ===")
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

if main_db:
    conn = sqlite3.connect(main_db)
    c = conn.cursor()
    
    # Get a known input text from history
    c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
    history = json.loads(c.fetchone()[0])
    sample_text = history[0]['inputText'][:50]
    print(f"Searching for text: {sample_text}")
    
    # Search in all values
    c.execute("SELECT key, length(value) FROM ItemTable WHERE value LIKE ? ORDER BY length(value) DESC", (f'%{sample_text}%',))
    rows = c.fetchall()
    print(f"\nKeys containing sample text ({len(rows)}):")
    for k, size in rows:
        print(f"  {k}: {size} bytes")
    
    # Now search for "assistant" or "user" - common message role fields
    print("\n\n=== Searching for message-like structures ===")
    # Look for keys that might contain message arrays
    c.execute("SELECT key FROM ItemTable WHERE value LIKE '%\"role\"%' AND value LIKE '%\"content\"%' ORDER BY length(value) DESC LIMIT 20")
    rows = c.fetchall()
    print(f"Keys with role+content pattern: {len(rows)}")
    for k in rows[:10]:
        print(f"  {k[0]}")
    
    conn.close()
