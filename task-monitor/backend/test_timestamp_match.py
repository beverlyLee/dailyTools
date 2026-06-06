#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from session import get_session_detail, _get_session_time_range, _find_prompt_by_timestamp

def main():
    print("=== 测试时间范围 ===")
    min_ts, max_ts = _get_session_time_range()
    from datetime import datetime
    print(f"最早: {datetime.fromtimestamp(min_ts)}")
    print(f"最晚: {datetime.fromtimestamp(max_ts)}")
    print(f"跨度: {(max_ts - min_ts) / 86400:.1f} 天")

    print()
    print("=== 测试真实 session 的 prompt 匹配 ===")

    test_ids = [
        ("AI Agent Session", "6a0ebf8e9d048a66d69ff4ae"),
        ("Chat Store Session", "6a1a23c3c753a474807c78a8"),
        ("Memento Session", "6a2392996f191e0ba49df109"),
    ]

    for name, sid in test_ids:
        print(f"\n--- {name}: {sid} ---")
        prompt = _find_prompt_by_timestamp(sid)
        if prompt:
            print(f"  找到 prompt，长度: {len(prompt)}")
            print(f"  前80字: {prompt[:80]}...")
        else:
            print(f"  未找到 prompt")

    print()
    print("=== 测试完整 get_session_detail ===")
    for name, sid in test_ids:
        print(f"\n--- {name}: {sid} ---")
        detail = get_session_detail(sid)
        if detail:
            print(f"  标题: {detail.get('title', '') or detail.get('display_name', '')}")
            print(f"  有 prompt: {bool(detail.get('prompt'))}")
            if detail.get('prompt'):
                print(f"  prompt 长度: {len(detail['prompt'])}")
                print(f"  prompt 前80字: {detail['prompt'][:80]}...")
        else:
            print(f"  未找到 session")

if __name__ == "__main__":
    main()
