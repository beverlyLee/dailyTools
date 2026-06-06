#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session import _get_main_input_history_db
import sqlite3
import json

def main():
    main_db = _get_main_input_history_db()
    if not main_db:
        print("No input history DB found")
        return

    label, db_path = main_db
    print(f"Using DB: {label} - {db_path}")
    print()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM ItemTable WHERE key = 'icube-ai-agent-storage-input-history'")
    row = cursor.fetchone()
    if not row:
        print("No input history found")
        conn.close()
        return

    history = json.loads(row[0])
    if not isinstance(history, list):
        print("History is not a list")
        conn.close()
        return

    print(f"Total history items: {len(history)}")
    print()

    print("=== 前 5 条 (索引 0-4) ===")
    for i in range(min(5, len(history))):
        item = history[i]
        text = item.get('inputText', '')
        first_line = text.strip().split('\n')[0][:80]
        print(f"[{i}] {first_line}")

    print()
    print("=== 后 5 条 (最后 5 条) ===")
    for i in range(max(0, len(history)-5), len(history)):
        item = history[i]
        text = item.get('inputText', '')
        first_line = text.strip().split('\n')[0][:80]
        print(f"[{i}] {first_line}")

    conn.close()

if __name__ == "__main__":
    main()
