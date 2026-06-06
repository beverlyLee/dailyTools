#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from session import get_all_sessions, get_session_by_id, get_active_tasks

print("=== 当前活跃任务 ===")
active = get_active_tasks()
for s in active[:5]:
    print(f"  {s.session_id}: workspace={s.workspace}, is_active={s.is_active}")

print()
print(f"活跃任务总数: {len(active)}")

print()
print("=== 所有 sessions 中 workspace=backend 的 ===")
all_s = get_all_sessions()
backend_sessions = [s for s in all_s if s.workspace == 'backend']
print(f"找到 {len(backend_sessions)} 个")
for s in backend_sessions[:5]:
    print(f"  {s.session_id}: workspace={s.workspace}, is_active={s.is_active}")

print()
print("=== 测试 session ID 6a0eb59fd14a6fe1e6372c4d ===")
s = get_session_by_id('6a0eb59fd14a6fe1e6372c4d')
if s:
    print(f"  session_id: {s.session_id}")
    print(f"  workspace: {s.workspace}")
    print(f"  is_active: {s.is_active}")
    print(f"  source: {s.source}")
    print(f"  command: {s.command[:100] if s.command else ''}...")
else:
    print("  未找到")

print()
print("=== 所有 sandbox sessions (前10个) ===")
sandbox_sessions = [s for s in all_s if s.session_type == 'sandbox']
print(f"总数: {len(sandbox_sessions)}")
for s in sandbox_sessions[:10]:
    print(f"  {s.session_id}: ws={s.workspace}, active={s.is_active}, title={s.title[:30] if s.title else ''}")
