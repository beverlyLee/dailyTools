#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import time

APP_NAME = "TRAE CN"

def run_apple_script(script):
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return "", str(e)

print("=" * 60)
print("调试 TRAE CN 可访问性信息")
print("=" * 60)

# 1. 检查应用是否运行
print("\n1. 检查应用是否运行...")
script = f'application "{APP_NAME}" is running'
stdout, stderr = run_apple_script(script)
print(f"   运行状态: {stdout}")
if stderr:
    print(f"   错误: {stderr}")

# 2. 激活应用
print("\n2. 尝试激活应用...")
script = f'tell application "{APP_NAME}" to activate'
stdout, stderr = run_apple_script(script)
print(f"   激活结果: {'成功' if not stderr else '失败'}")
if stderr:
    print(f"   错误: {stderr}")

time.sleep(1)

# 3. 获取窗口列表
print("\n3. 获取窗口列表...")
script = f'''
tell application "System Events"
    tell process "{APP_NAME}"
        set windowNames to name of every window
        return windowNames
    end tell
end tell
'''
stdout, stderr = run_apple_script(script)
print(f"   窗口数量: {stdout.count(',') + 1 if stdout else 0}")
print(f"   窗口名称: {stdout}")
if stderr:
    print(f"   错误: {stderr}")

# 4. 获取窗口属性
print("\n4. 获取窗口详细属性...")
script = f'''
tell application "System Events"
    tell process "{APP_NAME}"
        set winInfo to ""
        repeat with w in windows
            set winInfo to winInfo & "Window: " & name of w & "\n"
            try
                set winInfo to winInfo & "  Subrole: " & subrole of w & "\n"
            end try
            try
                set winInfo to winInfo & "  Description: " & description of w & "\n"
            end try
        end repeat
        return winInfo
    end tell
end tell
'''
stdout, stderr = run_apple_script(script)
print(f"   窗口信息:\n{stdout}")
if stderr:
    print(f"   错误: {stderr}")

# 5. 尝试获取 UI 元素
print("\n5. 尝试获取 UI 元素文本...")
script = f'''
tell application "System Events"
    tell process "{APP_NAME}"
        set frontmost to true
        set allText to ""
        
        try
            set staticTexts to static text of UI element 1 of front window
            repeat with t in staticTexts
                set allText to allText & value of t & " "
            end repeat
        end try
        
        return allText
    end tell
end tell
'''
stdout, stderr = run_apple_script(script)
print(f"   UI 元素文本: {stdout[:200]}...")
if stderr:
    print(f"   错误: {stderr}")

# 6. 另一种方式 - 获取整个 UI 树
print("\n6. 尝试获取所有 UI 元素内容...")
script = f'''
tell application "System Events"
    tell process "{APP_NAME}"
        set frontmost to true
        set result to ""
        
        try
            set win to front window
            set result to my getTextFromElements(entire contents of win)
        end try
        
        return result
    end tell
end tell

on getTextFromElements(elements)
    set textResult to ""
    repeat with elem in elements
        try
            if class of elem is static text then
                set val to value of elem
                if val is not missing value then
                    set textResult to textResult & val & " "
                end if
            end if
        end try
    end repeat
    return textResult
end getTextFromElements
'''
stdout, stderr = run_apple_script(script)
print(f"   获取到的文本长度: {len(stdout)} 字符")
print(f"   前300字符: {stdout[:300]}")
if stderr:
    print(f"   错误: {stderr}")

# 7. 检查是否有权限
print("\n7. 检查可访问性权限状态...")
script = '''
tell application "System Events"
    set hasPermission to UI elements enabled
    return hasPermission
end tell
'''
stdout, stderr = run_apple_script(script)
print(f"   可访问性权限: {stdout}")
if stderr:
    print(f"   错误: {stderr}")

print("\n" + "=" * 60)
print("调试完成")
print("=" * 60)
