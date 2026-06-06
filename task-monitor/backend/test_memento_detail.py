#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session import _get_all_workspace_storage_paths
import sqlite3
import json

def main():
    for label, db_path in _get_all_workspace_storage_paths():
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'")
            row = cursor.fetchone()
            if not row:
                conn.close()
                continue

            storage = json.loads(row[0])
            print(f"=== {label} ===")
            print(f"Keys: {list(storage.keys())}")

            slist = storage.get('list', [])
            print(f"\nSession list count: {len(slist)}")

            if slist:
                print("\nFirst session full data:")
                print(json.dumps(slist[0], indent=2, ensure_ascii=False)[:2000])

                print("\nAll session IDs and keys:")
                for s in slist:
                    print(f"  {s.get('sessionId', '?')}: keys={list(s.keys())}")

            conn.close()
            break
        except Exception as e:
            print(f"Error: {e}")
            continue

if __name__ == "__main__":
    main()
