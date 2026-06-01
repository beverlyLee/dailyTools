#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import sys

# 尝试读取 leveldb 日志文件
leveldb_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/Local Storage/leveldb/000003.log")
indexeddb_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN/IndexedDB/vscode-file_vscode-app_0.indexeddb.leveldb/000005.ldb")

print("=" * 60)
print("读取 Local Storage leveldb")
print("=" * 60)

with open(leveldb_path, 'rb') as f:
    data = f.read()
    # 尝试提取可读的字符串
    text = data.decode('utf-8', errors='ignore')
    print(f"文件大小: {len(data)} bytes")
    print(f"可读取的字符: {len([c for c in text if c.isprintable()])}")
    
    # 查找 JSON 片段
    import re
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, text)
    print(f"\n找到 {len(matches)} 个可能的 JSON 片段")
    
    for i, match in enumerate(matches[:10]):
        if len(match) > 50:
            try:
                parsed = json.loads(match)
                print(f"\n--- 片段 {i} (有效 JSON) ---")
                print(json.dumps(parsed, indent=2, ensure_ascii=False)[:500])
            except:
                if "task" in match.lower() or "solo" in match.lower() or "完成" in match:
                    print(f"\n--- 片段 {i} (含任务关键词) ---")
                    print(match[:300])

print("\n" + "=" * 60)
print("查找包含任务相关关键词的内容")
print("=" * 60)

keywords = ["任务", "task", "完成", "进行中", "status", "solo", "conversation"]
for kw in keywords:
    if kw in text:
        print(f"✓ 找到关键词: '{kw}'")
        # 显示关键词周围的上下文
        idx = text.find(kw)
        start = max(0, idx - 100)
        end = min(len(text), idx + 200)
        print(f"  上下文: ...{text[start:end]}...")

# 检查 IndexedDB
print("\n" + "=" * 60)
print("读取 IndexedDB")
print("=" * 60)

with open(indexeddb_path, 'rb') as f:
    data = f.read()
    text = data.decode('utf-8', errors='ignore')
    print(f"文件大小: {len(data)} bytes")
    
    for kw in keywords:
        if kw in text:
            print(f"✓ 找到关键词: '{kw}'")
            idx = text.find(kw)
            start = max(0, idx - 100)
            end = min(len(text), idx + 200)
            print(f"  上下文: ...{text[start:end]}...")

# 搜索整个应用目录中的任务相关文件
print("\n" + "=" * 60)
print("搜索任务相关文件")
print("=" * 60)

search_paths = [
    "~/Library/Application Support/TRAE SOLO CN/",
]

for base_path in search_paths:
    path = os.path.expanduser(base_path)
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith(('.json', '.log', '.db')):
                filepath = os.path.join(root, file)
                try:
                    if file.endswith('.json'):
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            if any(kw in content.lower() for kw in ['task', '任务', 'solo', 'conversation']):
                                print(f"✓ {filepath}")
                except:
                    pass
