#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from session import get_session_detail

print("=== 测试1: 真实 chat session ID ===")
real_chat_id = '6a0ebf8e9d048a66d69ff4ae'
print(f"查询: " + real_chat_id)
detail = get_session_detail(real_chat_id)
if detail:
    print("  找到!")
    print(f"  session_type: " + str(detail.get("session_type")))
    print(f"  display_name: " + str(detail.get("display_name")))
    print(f"  is_active: " + str(detail.get("is_active")))
    print(f"  prompt 长度: " + str(len(detail.get("prompt", ""))))
else:
    print("  未找到")

print()
print("=== 测试2: sandbox session ID ===")
sandbox_id = '6a0eb59fd14a6fe1e6372c4d'
print(f"查询: " + sandbox_id)
detail = get_session_detail(sandbox_id)
if detail:
    print("  找到!")
    print(f"  workspace: " + str(detail.get("workspace")))
    print(f"  prompt 长度: " + str(len(detail.get("prompt", ""))))
    prompt = detail.get("prompt", "")
    if prompt:
        print("  prompt 前100字: " + prompt[:100])
else:
    print("  未找到")

print()
print("=== 测试3: 不存在的 session ID ===")
fake_id = 'nonexistent123'
print(f"查询: " + fake_id)
detail = get_session_detail(fake_id)
if detail:
    print("  找到!")
else:
    print("  未找到 (正确)")
