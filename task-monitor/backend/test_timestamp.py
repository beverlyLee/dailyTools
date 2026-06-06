#!/usr/bin/env python3
import time

# 测试 session ID 中是否包含时间戳
test_ids = [
    "6a0ebf8e9d048a66d69ff4ae",  # ai-agent session
    "6a1a23c3c753a474807c78a8",  # chat store session
    "6a2392996f191e0ba49df109",  # memento storage session
    "6a05d38a3dcf7d740e257050",  # sandbox session
]

for sid in test_ids:
    if len(sid) == 24:
        timestamp_hex = sid[:8]
        timestamp = int(timestamp_hex, 16)
        human_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
        print(f"{sid}: timestamp={timestamp} -> {human_time}")
    else:
        print(f"{sid}: not 24 chars (len={len(sid)})")

print()
print(f"当前时间: {int(time.time())} -> {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}")
