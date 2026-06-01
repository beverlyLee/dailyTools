#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import os
import time

def take_screenshot(output_path="/tmp/test_ocr.png"):
    try:
        subprocess.run(
            ["screencapture", "-x", output_path],
            check=True,
            capture_output=True,
            timeout=10
        )
        return output_path
    except Exception as e:
        print(f"截图失败: {e}")
        return None

def ocr_with_tesseract(image_path):
    try:
        result = subprocess.run(
            ["tesseract", "-l", "chi_sim+eng", image_path, "stdout"],
            capture_output=True,
            timeout=60
        )
        text = result.stdout.decode('utf-8', errors='ignore')
        return text
    except Exception as e:
        print(f"OCR 失败: {e}")
        return None

print("=" * 60)
print("测试 OCR 功能")
print("=" * 60)

print("\n请确保 TRAE CN 窗口可见，并且包含一些文字...")
time.sleep(2)

print("\n正在截图...")
screenshot_path = take_screenshot()

if screenshot_path:
    print(f"截图已保存: {screenshot_path}")
    
    print("\n正在进行 OCR 识别...")
    text = ocr_with_tesseract(screenshot_path)
    
    if text:
        print(f"\n识别到 {len(text)} 个字符:")
        print("-" * 60)
        print(text[:500])
        if len(text) > 500:
            print("...(截断)")
        print("-" * 60)
        
        test_keywords = ["已完成", "完成", "成功", "✅", "正在", "处理"]
        print("\n关键词检测:")
        for kw in test_keywords:
            if kw in text:
                print(f"  ✅ 找到: '{kw}'")
            else:
                print(f"  ❌ 未找到: '{kw}'")
    else:
        print("OCR 返回空")
    
    os.remove(screenshot_path)
else:
    print("截图失败")

print("\n" + "=" * 60)
