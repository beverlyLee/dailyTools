#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from session import get_session_detail, get_all_sessions

print("=== 测试所有 sandbox session 的 prompt ===")
all_s = get_all_sessions()
sandbox_sessions = [s for s in all_s if s.session_type == 'sandbox']

for s in sandbox_sessions:
    detail = get_session_detail(s.session_id)
    has_prompt = bool(detail.get('prompt')) if detail else False
    prompt_len = len(detail.get('prompt', '')) if detail else 0
    print(f"  {s.session_id}: ws={s.workspace}, active={s.is_active}, has_prompt={has_prompt}, len={prompt_len}")
    if has_prompt and detail:
        print(f"    prompt前50字: {detail['prompt'][:50]}")

print()
print("=== 测试几个真实的 chat session ===")
test_ids = [
    '6a0ebf8e9d048a66d69ff4ae',
    '6a0ec0089d048a66d69ff4ec',
    '6a2392996f191e0ba49df109',  # 来自 memento storage
]
for sid in test_ids:
    detail = get_session_detail(sid)
    if detail:
        has_prompt = bool(detail.get('prompt'))
        print(f"  {sid}: found=True, type={detail['session_type']}, has_prompt={has_prompt}")
    else:
        print(f"  {sid}: found=False")
