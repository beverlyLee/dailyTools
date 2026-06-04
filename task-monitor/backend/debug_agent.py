#!/usr/bin/env python3
import os, json, sqlite3, subprocess, re

def get_current_sessions():
    # Check if there's any active AI execution
    # Look for Trae processes that might indicate active execution
    result = subprocess.run(
        ["ps", "-A", "-o", "pid,command"],
        capture_output=True, text=True, timeout=5,
    )
    trae_processes = []
    for line in result.stdout.splitlines()[1:]:
        if 'trae' in line.lower() or 'Trae' in line:
            trae_processes.append(line)
    return trae_processes

def explore_sessions():
    ws = os.path.expanduser("~/Library/Application Support/Trae CN/User/workspaceStorage")
    
    for item in os.listdir(ws):
        db = os.path.join(ws, item, "state.vscdb")
        if not os.path.exists(db):
            continue
        conn = sqlite3.connect(db)
        c = conn.cursor()
        
        # Check input-history-query - it might have current session info
        c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history-query'")
        row = c.fetchone()
        if row:
            query_data = json.loads(row[0])
            print("=== input-history-query ===")
            for k, v in query_data.items():
                if k == 'inputText':
                    print(f"  inputText: {str(v)[:100]}")
                elif isinstance(v, list):
                    print(f"  {k}: list of {len(v)} items")
                else:
                    print(f"  {k}: {str(v)[:80]}")
        
        # Check if there's a "current" or "active" indicator anywhere
        c.execute("SELECT key FROM ItemTable WHERE value LIKE '%isCurrent%' OR value LIKE '%isActive%' OR value LIKE '%running%'")
        rows = c.fetchall()
        print(f"\nKeys containing isCurrent/isActive/running: {len(rows)}")
        for r in rows[:10]:
            print(f"  {r[0]}")
        
        # Also look at memento/icube-ai-agent-storage more carefully
        c.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
        row2 = c.fetchone()
        if row2:
            data = json.loads(row2[0])
            print(f"\n=== icube-ai-agent-storage ===")
            print(f"Top-level keys: {list(data.keys())}")
            agent_list = data.get("list", [])
            print(f"Agent list: {len(agent_list)} sessions")
            
            # Check if messages are really empty or if we're missing something
            for i, s in enumerate(agent_list[:3]):
                msgs = s.get('messages', [])
                print(f"  [{i}] sessionId={s.get('sessionId')[:16]}..., isCurrent={s.get('isCurrent')}, messages type={type(msgs).__name__}")
                if msgs:
                    print(f"    first msg: {str(msgs[0])[:80]}")
        
        # Let's check all input-history items, not just those with project names
        c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
        row3 = c.fetchone()
        if row3:
            history = json.loads(row3[0])
            print(f"\n=== Input history: {len(history)} items ===")
            
            # Get ALL unique "first messages" as tasks
            tasks = []
            seen_texts = set()
            for i, item in enumerate(history):
                if not isinstance(item, dict):
                    continue
                text = item.get('inputText', '')
                if not text:
                    continue
                # Use first line as task identifier
                first_line = text.strip().split('\n')[0].strip()
                if first_line and first_line not in seen_texts:
                    seen_texts.add(first_line)
                    tasks.append({
                        'index': i,
                        'first_line': first_line[:80],
                        'full_text': text[:200]
                    })
            
            print(f"Unique tasks (by first line): {len(tasks)}")
            print("\nLast 10 tasks (most recent first):")
            for t in reversed(tasks[-10:]):
                print(f"  [{t['index']}] {t['first_line'][:60]}")
        
        conn.close()
        break

if __name__ == "__main__":
    print("=== Current Trae processes ===")
    processes = get_current_sessions()
    print(f"Total: {len(processes)}")
    for p in processes[:10]:
        print(f"  {p[:80]}")
    print()
    explore_sessions()
