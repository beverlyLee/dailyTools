#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess

print("=" * 60)
print("检查运行中的进程")
print("=" * 60)

# 查找所有包含 "trae" 的进程
result = subprocess.run(
    ["ps", "aux"],
    capture_output=True,
    text=True
)

print("\n包含 'trae' 的进程:")
for line in result.stdout.splitlines():
    if "trae" in line.lower():
        print(f"  {line[-80:]}")

# 查找所有应用进程
print("\n\n在 /Applications 中查找:")
result = subprocess.run(
    ["ls", "/Applications/"],
    capture_output=True,
    text=True
)
for line in result.stdout.splitlines():
    if "trae" in line.lower():
        print(f"  {line}")

# 尝试不同的进程名称
for app_name in ["TRAE CN", "Trae", "trae"]:
    print(f"\n\n尝试获取 '{app_name}' 进程:")
    script = f'''
    tell application "System Events"
        try
            set proc to first process whose name is "{app_name}"
            return "Found: " & name of proc
        on error
            return "Not found"
        end try
    end tell
    '''
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True
    )
    print(f"  结果: {result.stdout.strip()}")
    if result.stderr:
        print(f"  错误: {result.stderr.strip()}")
