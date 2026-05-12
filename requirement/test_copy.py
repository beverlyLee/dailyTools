#!/usr/bin/env python3

import subprocess
import time
import sys

APP_NAME = "Trae CN"
DELAY_AFTER_FOCUS = 0.6
DELAY_KEY_HOLD = 0.07

def log(msg):
    print(msg)

def focus_trae():
    log(f"→ 激活 {APP_NAME}")
    subprocess.run(
        ["osascript", "-e", f'tell application "{APP_NAME}" to activate'],
        check=True
    )
    time.sleep(DELAY_AFTER_FOCUS)

def new_task():
    import pyautogui

    log("→ 发送 Ctrl + Cmd + N")

    pyautogui.keyDown("ctrl")
    pyautogui.keyDown("command")
    pyautogui.keyDown("n")

    time.sleep(DELAY_KEY_HOLD)

    pyautogui.keyUp("n")
    pyautogui.keyUp("command")
    pyautogui.keyUp("ctrl")

if __name__ == "__main__":
    log("===== 新建任务验证开始 =====")

    try:
        focus_trae()
        new_task()
        log("✅ 如果 Trae 打开了新任务窗口，说明脚本生效")
    except Exception as e:
        log(f"❌ 执行失败: {e}")
        sys.exit(1)

    log("===== 结束 =====")