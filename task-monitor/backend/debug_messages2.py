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

if not main_db:
    print("No main db found")
    exit(1)

print(f"Main DB: {main_db}")
conn = sqlite3.connect(main_db)
c = conn.cursor()

print("\n=== All keys (sorted by size, top 50) ===")
c.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 50")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

print("\n\n=== Sample input history entry ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
history = json.loads(c.fetchone()[0])
print(f"Total entries: {len(history)}")
if history:
    first = history[0]
    print(f"First entry keys: {list(first.keys())}")
    print(f"First entry inputText (first 200 chars): {first.get('inputText', '')[:200]}")
    print(f"Full first entry: {json.dumps(first, ensure_ascii=False, indent=2)[:1000]}")

print("\n\n=== memento/icube-ai-agent-storage details ===")
c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
row = c.fetchone()
if row:
    storage = json.loads(row[0])
    print(f"Storage keys: {list(storage.keys())}")
    slist = storage.get('list', [])
    print(f"List length: {len(slist)}")
    if slist:
        first = slist[0]
        print(f"First item keys: {list(first.keys())}")
        print(f"First item: {json.dumps(first, ensure_ascii=False, indent=2)[:2000]}")

print("\n\n=== Searching for keys with 'message' or 'chat' in name ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%message%' OR key LIKE '%chat%' OR key LIKE '%conversation%' ORDER BY length(value) DESC")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

print("\n\n=== Searching for sessionRelation keys ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%sessionRelation%' ORDER BY length(value) DESC")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

print("\n\n=== Searching for keys with 'ai-agent' ===")
c.execute("SELECT key, length(value) FROM ItemTable WHERE key LIKE '%ai-agent%' OR key LIKE '%ai_agent%' OR key LIKE '%icube%' ORDER BY length(value) DESC")
for k, size in c.fetchall():
    print(f"  {k}: {size} bytes")

conn.close()
