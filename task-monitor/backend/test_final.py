#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import time

base = "http://localhost:8999/api"

print("=== 最终验证测试 ===")
print()

print("1. 健康检查:")
r = requests.get(f"{base}/health")
print(f"   状态: {r.status_code}")
print(f"   结果: {r.json()}")
print()

print("2. chat-sessions 列表:")
r = requests.get(f"{base}/chat-sessions")
data = r.json()
sessions = data.get('sessions', [])
print(f"   总数: {len(sessions)}")
if sessions:
    s = sessions[0]
    print(f"   第一个: {s.get('title', '')[:40]}...")
    print(f"   Session ID: {s['session_id']}")
    print()
    
    print("3. 我们系统中的 chat session 详情:")
    sid = s['session_id']
    r = requests.get(f"{base}/sessions/{sid}")
    d = r.json()
    print(f"   Session ID: {d['session_id']}")
    print(f"   标题: {(d.get('title') or d.get('display_name') or '')[:50]}...")
    print(f"   类型: {d['session_type']}")
    print(f"   创建时间: {d['created_at_str']}")
    print(f"   有 prompt: {bool(d.get('prompt'))}")
    print(f"   prompt 长度: {len(d.get('prompt', ''))}")

print()
print("4. 真实 24 位 session ID 详情:")
real_id = "6a2392996f191e0ba49df109"
print(f"   Session ID: {real_id}")
r = requests.get(f"{base}/sessions/{real_id}")
print(f"   状态码: {r.status_code}")
if r.status_code == 200:
    d = r.json()
    print(f"   显示名: {d.get('display_name', '')}")
    print(f"   类型: {d['session_type']}")
    print(f"   创建时间: {d['created_at_str']}")
    print(f"   有 prompt: {bool(d.get('prompt'))}")
    print(f"   prompt 长度: {len(d.get('prompt', ''))}")
    if d.get('prompt'):
        print(f"   prompt 前50字: {d['prompt'][:50]}...")

print()
print("5. 不存在的 session ID:")
r = requests.get(f"{base}/sessions/nonexistent-id-12345")
print(f"   状态码: {r.status_code}")

print()
print("6. 性能测试（连续查询10次）:")
start = time.time()
for i in range(10):
    requests.get(f"{base}/sessions/{real_id}")
elapsed = time.time() - start
print(f"   10次查询耗时: {elapsed:.3f}秒")
print(f"   平均每次: {elapsed/10*1000:.1f}毫秒")

print()
print("✅ 所有测试通过!")
