#!/usr/bin/env python3

import argparse
import re
import subprocess
import time
import sys

# =========================================
# 配置区（只改这里）
# =========================================
APP_NAME = "TRAE CN"

# 时间间隔（单位：秒）
DELAY_AFTER_FOCUS = 0.6
DELAY_AFTER_SHORTCUT = 0.5
DELAY_KEY_HOLD = 0.07
DELAY_BETWEEN_TASKS = 1.2

# =========================================
# 工具函数
# =========================================
def log(msg):
    print(msg)

def parse_selection(sel):
    nums = set()
    for part in sel.split(","):
        part = part.strip()
        if "-" in part:
            a, b = map(int, part.split("-"))
            nums.update(range(a, b + 1))
        else:
            nums.add(int(part))
    return sorted(nums)


def extract_single_prompt(md_text, num):
    """
    从 md 中提取指定题号的 Prompt，
    并彻底移除所有 Markdown 语法，
    只保留纯自然语言文本。
    """
    import re

    # =========================================
    # 1. 定位 ## num. 标题
    # =========================================
    header = re.search(rf"^## {num}\.\s*.*?$", md_text, re.MULTILINE)
    if not header:
        return None

    remaining = md_text[header.end():]

    # =========================================
    # 2. 定位到下一个 ## 为止
    # =========================================
    next_header = re.search(r"^## \d+\.", remaining, re.MULTILINE)
    if next_header:
        block = remaining[:next_header.start()]
    else:
        block = remaining

    # =========================================
    # 3. 定位 Prompt: 起始
    # =========================================
    prompt_start = re.search(r"Prompt\s*[:：]", block, re.IGNORECASE)
    if not prompt_start:
        return None

    prompt_block = block[prompt_start.end():].strip()

    # =========================================
    # 4. Markdown → 纯文本（核心）
    # =========================================
    lines = prompt_block.splitlines()
    cleaned = []

    for line in lines:
        line = line.strip()

        # 1去掉无序列表符号
        line = re.sub(r'^[\s]*[\*\-\+]\s+', '', line)

        # 2去掉行内加粗 **text**
        line = re.sub(r'\*\*(.+?)\*\*', r'\1', line)

        # 3去掉代码块 `code`
        line = re.sub(r'`([^`]+)`', r'\1', line)

        # 4去掉标题符号 #
        line = re.sub(r'^#+\s*', '', line)

        # 5去掉“标签：”前面的星号和空格（兜底）
        line = re.sub(r'^\s*\*+\s*', '', line)

        # 6保留编号 1. 2. 3.（不做处理）

        if line:
            cleaned.append(line)

    # =========================================
    # 5. 合并文本，保留段落
    # =========================================
    text = '\n'.join(cleaned).strip()

    # 统一中文冒号（可选）
    text = re.sub(r'(\S)[:：]', r'\1：', text)

    return text

# =========================================
# Trae 操作（严格三步）
# =========================================
def focus_trae():
    subprocess.run(
        ["osascript", "-e", f'tell application "{APP_NAME}" to activate'],
        check=True
    )
    time.sleep(DELAY_AFTER_FOCUS)

def new_task():

    import pyautogui
    pyautogui.keyDown("ctrl")
    pyautogui.keyDown("command")
    pyautogui.keyDown("n")
    time.sleep(DELAY_KEY_HOLD)
    pyautogui.keyUp("n")
    pyautogui.keyUp("command")
    pyautogui.keyUp("ctrl")
    time.sleep(DELAY_AFTER_SHORTCUT)

def copy_text(text):
    import pyautogui
    pyautogui.keyDown("command")
    pyautogui.keyDown("v")
    time.sleep(DELAY_KEY_HOLD)
    pyautogui.keyUp("command")
    pyautogui.keyUp("v")


def paste_text(text):
    import pyautogui
    log(f"粘贴内容: {text}")
    subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
    copy_text(text)
    time.sleep(0.2)

def send():
    import pyautogui
    pyautogui.keyDown("enter")
    pyautogui.keyUp("enter")

# =========================================
# 主流程
# =========================================
def main():
    parser = argparse.ArgumentParser(
        description="从 md 文件中提取指定题号，逐个发送到 Trae CN"
    )
    parser.add_argument("--file", required=True, help="md 文件名")
    parser.add_argument("--nums", required=True, help="题号，如 1,3,5 或 2-4")
    args = parser.parse_args()

    with open(args.file, "r", encoding="utf-8") as f:
        md_text = f.read()

    nums = parse_selection(args.nums)

    for i, num in enumerate(nums):
        prompt = extract_single_prompt(md_text, num)
        if not prompt:
            log(f"⚠️ 未找到题号 {num}，跳过")
            continue

        log(f"\n>>> 处理第 {num} 条 ({i+1}/{len(nums)})")
        focus_trae()

        new_task()
        paste_text(prompt)
        send()

        time.sleep(DELAY_BETWEEN_TASKS)

    log("\n✅ 所有任务已完成")

if __name__ == "__main__":
    main()