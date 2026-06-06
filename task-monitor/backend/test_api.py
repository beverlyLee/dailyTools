#!/usr/bin/env python3
import requests
import json

base = "http://localhost:8999/api"

print("=== 测试1: 真实 chat session ID ===")
resp = requests.get(f"{base}/sessions/6a0ebf8e9d048a66d69ff4ae")
print(f"状态码: {resp.status_code}")
if resp.status_code == 200:
    d = resp.json()
    print(f"session_id: {d['session_id']}")
    print(f"session_type: {d['session_type']}")
    print(f"display_name: {d.get('display_name', '')}")
    print(f"has_prompt: {bool(d.get('prompt'))}")
    print(f"prompt_len: {len(d.get('prompt', ''))}")
else:
    print(f"错误: {resp.text}")

print()
print("=== 测试2: sandbox session ID ===")
resp = requests.get(f"{base}/sessions/6a0eb59fd14a6fe1e6372c4d")
print(f"状态码: {resp.status_code}")
if resp.status_code == 200:
    d = resp.json()
    print(f"session_id: {d['session_id']}")
    print(f"session_type: {d['session_type']}")
    print(f"workspace: {d.get('workspace', '')}")
    print(f"has_prompt: {bool(d.get('prompt'))}")
    print(f"prompt_len: {len(d.get('prompt', ''))}")
    if d.get('prompt'):
        print(f"prompt前100字: {d['prompt'][:100]}")
else:
    print(f"错误: {resp.text}")

print()
print("=== 测试3: 不存在的 session ===")
resp = requests.get(f"{base}/sessions/nonexistent123")
print(f"状态码: {resp.status_code} (预期404)")
