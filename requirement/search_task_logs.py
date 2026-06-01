#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import sqlite3

log_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/logs/aha_log/aha_electron_2026.0518.log")

print("=" * 60)
print("搜索任务相关日志")
print("=" * 60)

keywords = ['任务', 'task', '完成', '进行中', 'solo', 'status', 'conversation', 'agent', 'chat', 'running', 'done', 'complete']

with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print(f"总日志行数: {len(lines)}")

found_lines = []
for line in lines:
    for kw in keywords:
        if kw.lower() in line.lower():
            found_lines.append(line)
            break

print(f"\n找到 {len(found_lines)} 行包含关键词")
print("\n最近的 50 行:")
for line in found_lines[-50:]:
    if len(line.strip()) > 10:
        print(f"  {line.strip()[:200]}")

# 检查 ModularData 目录的数据库
print("\n" + "=" * 60)
print("检查 ModularData/ai-agent 目录")
print("=" * 60)

ai_agent_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent")
print(f"目录: {ai_agent_path}")
for root, dirs, files in os.walk(ai_agent_path):
    for file in files:
        filepath = os.path.join(root, file)
        size = os.path.getsize(filepath)
        print(f"  {file} ({size} bytes)")
        if file.endswith('.db') or file.endswith('.json'):
            print(f"    路径: {filepath}")

# 检查 database.db 是否是特定格式
db_path = os.path.join(ai_agent_path, "database.db")
if os.path.exists(db_path):
    print(f"\n检查数据库文件头:")
    with open(db_path, 'rb') as f:
        header = f.read(100)
        print(f"  原始: {header[:50]}")
        
        # 检查常见的文件标识
        if header.startswith(b'SQLite'):
            print("  ✓ SQLite 数据库")
        elif header[:4] == b'\x89PNG':
            print("  ✓ PNG 图片")
        elif header[:2] == b'PK':
            print("  ✓ ZIP 压缩文件")
        elif b'JSON' in header[:20].decode('utf-8', errors='ignore'):
            print("  ✓ 可能是 JSON")
        else:
            print("  ✗ 未知格式 (可能加密)")

# 搜索整个应用数据目录中的所有数据库
print("\n" + "=" * 60)
print("搜索所有数据库文件")
print("=" * 60)

base_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN")
for root, dirs, files in os.walk(base_path):
    for file in files:
        if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
            filepath = os.path.join(root, file)
            size = os.path.getsize(filepath)
            print(f"  {os.path.relpath(filepath, base_path)} ({size} bytes)")
            
            # 尝试打开
            try:
                conn = sqlite3.connect(filepath)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                print(f"    表: {[t[0] for t in tables]}")
                conn.close()
            except Exception as e:
                print(f"    无法打开: {e}")
