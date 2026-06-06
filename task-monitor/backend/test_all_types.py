#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from session import get_session_detail

print("=== 测试各种类型的 session ID ===")

test_cases = [
    ("sandbox session", "6a05d38a3dcf7d740e257050"),
    ("ai-agent session (from map)", "6a0ebf8e9d048a66d69ff4ae"),
    ("chat store session (from turnsHeight)", "6a1a23c3c753a474807c78a8"),
    ("不存在的 session", "nonexistent123456"),
]

for name, sid in test_cases:
    print(f"\n--- {name} ---")
    print(f"  ID: {sid}")
    detail = get_session_detail(sid)
    if detail:
        print(f"  找到: ✓")
        print(f"  类型: {detail.get('session_type')}")
        print(f"  显示名: {detail.get('display_name')}")
        print(f"  来源: {detail.get('source')}")
        print(f"  有 prompt: {bool(detail.get('prompt'))}")
        if detail.get('prompt'):
            print(f"  prompt 长度: {len(detail['prompt'])} 字符")
            print(f"  prompt 前50字: {detail['prompt'][:50]}...")
    else:
        print(f"  找到: ✗ (未找到)")
