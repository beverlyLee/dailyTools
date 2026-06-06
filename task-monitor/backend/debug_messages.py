#!/usr/bin/env python3
import os, json, sqlite3

def explore_session_data():
    ws = os.path.expanduser("~/Library/Application Support/Trae CN/User/workspaceStorage")
    
    for item in os.listdir(ws):
        db = os.path.join(ws, item, "state.vscdb")
        if not os.path.exists(db):
            continue
        conn = sqlite3.connect(db)
        c = conn.cursor()
        
        # Find the largest DB
        c.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
        row = c.fetchone()
        if not row:
            conn.close()
            continue
        history = json.loads(row[0])
        if len(history) < 100:
            conn.close()
            continue
        
        print(f"\n=== DB: {item} ===")
        print(f"Input history: {len(history)} items")
        
        # Search for all keys that might contain messages/conversations
        c.execute("SELECT key FROM ItemTable WHERE key LIKE '%message%' OR key LIKE '%conversation%' OR key LIKE '%chat%' OR key LIKE '%history%'")
        keys = [r[0] for r in c.fetchall()]
        print(f"\nMessage/chat/history keys ({len(keys)}):")
        for k in sorted(keys):
            c.execute("SELECT length(value) FROM ItemTable WHERE key = ?", (k,))
            size = c.fetchone()[0]
            print(f"  {k}: {size} bytes")
        
        # Check icube_session_agent_map
        c.execute("SELECT value FROM ItemTable WHERE key = 'icube_session_agent_map'")
        row2 = c.fetchone()
        if row2:
            agent_map = json.loads(row2[0])
            print(f"\nAgent map: {len(agent_map)} sessions")
            
            # Get a sample session ID
            sample_sid = list(agent_map.keys())[0]
            print(f"Sample session ID: {sample_sid}")
            
            # Search for any data related to this session
            c.execute("SELECT key FROM ItemTable WHERE value LIKE ?", (f'%{sample_sid}%',))
            related_keys = [r[0] for r in c.fetchall()]
            print(f"\nKeys containing sample session ID ({len(related_keys)}):")
            for k in related_keys[:10]:
                print(f"  {k}")
        
        # Check icube modules preview - might have messages
        c.execute("SELECT key FROM ItemTable WHERE key LIKE 'icube-modules-preview%'")
        keys = [r[0] for r in c.fetchall()]
        print(f"\nicube-modules-preview keys ({len(keys)}):")
        for k in keys[:10]:
            c.execute("SELECT substr(value, 1, 200) FROM ItemTable WHERE key = ?", (k,))
            val = c.fetchone()[0]
            print(f"  {k}: {val[:100]}")
        
        # Check ICubeWebviewService
        c.execute("SELECT key FROM ItemTable WHERE key LIKE 'ICubeWebviewService%'")
        keys = [r[0] for r in c.fetchall()]
        print(f"\nICubeWebviewService keys ({len(keys)}):")
        for k in keys[:10]:
            c.execute("SELECT length(value) FROM ItemTable WHERE key = ?", (k,))
            size = c.fetchone()[0]
            print(f"  {k}: {size} bytes")
        
        # Check all large values - they might contain messages
        c.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 20")
        rows = c.fetchall()
        print(f"\nTop 20 largest values:")
        for k, size in rows:
            print(f"  {k}: {size} bytes")
        
        conn.close()
        break

if __name__ == "__main__":
    explore_session_data()
