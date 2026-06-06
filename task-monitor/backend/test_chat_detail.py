#!/usr/bin/env python3
import requests

base = "http://localhost:8999/api"

print("=== 获取 chat sessions 列表 ===")
resp = requests.get(f"{base}/chat-sessions")
data = resp.json()
sessions = data.get('sessions', [])
print(f"总数: {len(sessions)}")

print()
print("=== 测试前3个 chat session 的详情 ===")
for s in sessions[:3]:
    sid = s['session_id']
    title = s.get('title', '')[:50]
    print(f"\n--- {sid} ---")
    print(f"  标题: {title}")
    
    detail_resp = requests.get(f"{base}/sessions/{sid}")
    if detail_resp.status_code == 200:
        detail = detail_resp.json()
        print(f"  有 prompt: {bool(detail.get('prompt'))}")
        if detail.get('prompt'):
            print(f"  prompt 长度: {len(detail['prompt'])}")
            print(f"  prompt 前50字: {detail['prompt'][:50]}...")
    else:
        print(f"  查询失败: {detail_resp.status_code}")
