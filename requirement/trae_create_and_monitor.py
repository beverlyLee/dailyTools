#!/usr/bin/env python3

import argparse
import subprocess
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from trae_create_task import (
    APP_NAME, DELAY_AFTER_FOCUS, DELAY_AFTER_SHORTCUT, DELAY_KEY_HOLD,
    parse_selection, extract_single_prompt, focus_trae, new_task, 
    paste_text, send, log as trae_log
)
from task_monitor import monitor_task, take_screenshot, log as monitor_log

DELAY_AFTER_SEND = 5

def process_task(num, prompt, monitor=True, monitor_timeout=600, screenshot=False):
    trae_log(f"\n>>> 处理第 {num} 条")
    focus_trae()

    new_task()
    paste_text(prompt)
    send()
    
    trae_log(f"任务已发送，等待 {DELAY_AFTER_SEND} 秒后开始监控...")
    time.sleep(DELAY_AFTER_SEND)
    
    if monitor:
        monitor_log(f"开始监控任务 {num}...")
        from task_monitor import monitor_by_cpu
        success = monitor_by_cpu(timeout=monitor_timeout)
        
        if screenshot:
            screenshot_path = take_screenshot()
            if screenshot_path:
                monitor_log(f"📸 截图已保存: {screenshot_path}")
        
        return success
    return True

def main():
    parser = argparse.ArgumentParser(
        description="从 md 文件中提取指定题号，发送到 Trae CN 并监控执行状态"
    )
    parser.add_argument("--file", required=True, help="md 文件名")
    parser.add_argument("--nums", required=True, help="题号，如 1,3,5 或 2-4")
    parser.add_argument("--no-monitor", action="store_true", help="不监控任务状态")
    parser.add_argument("--timeout", type=int, default=600, help="监控超时时间（秒）")
    parser.add_argument("--screenshot", action="store_true", help="每个任务完成后保存截图")
    parser.add_argument("--delay", type=float, default=1.2, help="任务之间的间隔时间（秒）")
    
    args = parser.parse_args()

    with open(args.file, "r", encoding="utf-8") as f:
        md_text = f.read()

    nums = parse_selection(args.nums)
    results = []

    for i, num in enumerate(nums):
        prompt = extract_single_prompt(md_text, num)
        if not prompt:
            trae_log(f"⚠️ 未找到题号 {num}，跳过")
            results.append((num, False, "未找到题号"))
            continue

        try:
            success = process_task(
                num, prompt, 
                monitor=not args.no_monitor,
                monitor_timeout=args.timeout,
                screenshot=args.screenshot
            )
            results.append((num, success, "完成" if success else "超时/失败"))
        except Exception as e:
            trae_log(f"❌ 处理题号 {num} 时出错: {e}")
            results.append((num, False, str(e)))
        
        if i < len(nums) - 1:
            time.sleep(args.delay)

    trae_log("\n" + "=" * 60)
    trae_log("📊 任务执行总结")
    trae_log("=" * 60)
    
    for num, success, msg in results:
        status = "✅ 成功" if success else "❌ 失败"
        trae_log(f"  题号 {num}: {status} - {msg}")
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    trae_log(f"\n总计: {passed}/{total} 成功 ({passed/total*100:.1f}%)")
    
    if passed == total:
        trae_log("\n🎉 所有任务执行完成!")
    else:
        trae_log(f"\n⚠️  有 {total - passed} 个任务失败或超时")

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
