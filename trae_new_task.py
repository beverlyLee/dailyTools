#!/usr/bin/env python3
"""
Trae IDE 自动化脚本：
1. 在当前 Trae 窗口点击"新建任务"
2. 将需求 Prompt 粘贴到输入框

使用前：确保 Trae 当前窗口处于前台
运行：python3 trae_new_task.py
"""

import time
import pyautogui
import pyperclip

# === 第3个需求的 Prompt ===
PROMPT = """需求: 需求是开发一个试卷错题自动提取与排版工具，在 `/exam-paper-extractor/` 文件夹下，主要实现的是解决学生整理错题本时，从多页试卷中手动裁剪、拼接、排版耗时费力的问题。
技术栈: HTML5, JavaScript, Canvas API, jsPDF (PDF 生成库).
环境配置: 通过 CDN 引入 jsPDF。
功能模块拆分:
1. 透视矫正 (PerspectiveCorrector.js): 用户框选试卷区域，算法通过四点透视变换矫正梯形畸变，得到正视图。
2. 题目分割 (TextBlockSplitter.js): 利用水平投影法分析行间距，将试卷分割成独立的题目区块。
3. A4 排版 (A4LayoutEngine.js): 将选中的错题区块重新排列到 A4 画布上，生成可直接打印的 PDF 文件。
项目验证方法: 上传一张倾斜拍摄的试卷照片，框选 3 道错题，点击生成，预览 A4 排版效果并打印测试。"""

def click_new_task():
    """点击左侧「新建任务」按钮"""
    # 提示用户确认位置
    print("即将点击「新建任务」按钮...")
    print("请在 3 秒内确保 Trae 窗口处于前台且左侧面板可见")
    time.sleep(3)

    # 使用键盘快捷键方式：Trae 中新建任务的快捷键
    # 先尝试 Command+Shift+P 打开命令面板，然后输入新建任务
    pyautogui.hotkey('command', 'shift', 'p')
    time.sleep(0.8)

    # 输入"新建任务"搜索
    pyperclip.copy("新建任务")
    pyautogui.hotkey('command', 'v')
    time.sleep(0.5)

    # 按回车确认
    pyautogui.press('enter')
    time.sleep(1.0)

def paste_prompt():
    """将 Prompt 粘贴到输入框"""
    print("正在粘贴 Prompt 到输入框...")
    time.sleep(0.5)

    # 复制 Prompt 到剪贴板并粘贴
    pyperclip.copy(PROMPT)
    pyautogui.hotkey('command', 'v')
    time.sleep(0.5)
    print("Prompt 已粘贴！按 Enter 即可发送。")

if __name__ == "__main__":
    print("=" * 50)
    print("Trae 新建任务自动化脚本")
    print("=" * 50)
    print()
    print("前置条件：Trae 当前窗口处于前台")
    print()

    # 步骤1: 点击新建任务
    print("[1/2] 新建任务...")
    click_new_task()

    # 步骤2: 粘贴 Prompt
    print("[2/2] 粘贴 Prompt...")
    paste_prompt()

    print()
    print("完成！如需发送，请在 Trae 中按 Enter。")
