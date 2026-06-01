#!/usr/bin/env python3
"""molecular-kitchen 浏览器交互测试"""
import os
import time
import json
from playwright.sync_api import sync_playwright

OUT_DIR = "/Users/liboyang/trae/dailyTools/molecular-kitchen/img"
os.makedirs(OUT_DIR, exist_ok=True)

URL = "http://localhost:5176/"

console_errors = []
page_errors = []

def log(test_name, status, details=""):
    icon = "PASS" if status else "FAIL"
    print(f"[{icon}] {test_name} | {details}")

results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    def on_console(msg):
        if msg.type in ["error"]:
            console_errors.append(f"[console:{msg.type}] {msg.text}")

    def on_pageerror(err):
        page_errors.append(f"[pageerror] {err}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    # Test 1: 页面加载
    try:
        page.goto(URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        page.screenshot(path=os.path.join(OUT_DIR, "01_initial.png"))
        log("1. 页面加载", True, "networkidle")
        results.append(("页面加载", True))
    except Exception as e:
        log("1. 页面加载", False, str(e))
        results.append(("页面加载", False, str(e)))

    # Test 2: 标题与控件是否存在
    try:
        h1 = page.locator("h1").first.inner_text(timeout=5000)
        log("2. 标题渲染", "分子厨房" in h1, f"标题: {h1}")
        results.append(("标题渲染", "分子厨房" in h1, h1))

        slider = page.locator("input[type=range]").first
        exists = slider.is_visible(timeout=5000)
        log("3. 切肉滑块存在", exists)
        results.append(("切肉滑块存在", exists))

        value_text = page.locator(".value").first.inner_text(timeout=5000)
        log("4. 初始百分比显示", "%" in value_text, f"值: {value_text}")
        results.append(("初始百分比显示", "%" in value_text, value_text))

        canvas = page.locator("canvas").first
        canvas_exists = canvas.is_visible(timeout=5000)
        log("5. 3D 画布存在", canvas_exists)
        results.append(("3D画布存在", canvas_exists))
    except Exception as e:
        log("渲染检测", False, str(e))
        results.append(("渲染检测", False, str(e)))

    # Test 3: 拖动滑块到 20% (接近底部)
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUT_DIR, "02_slice_20pct.png"))
        val = page.locator(".value").first.inner_text()
        log("6. 滑块 20% 交互", True, f"值: {val}")
        results.append(("滑块20%交互", True, val))
    except Exception as e:
        log("6. 滑块 20% 交互", False, str(e))
        results.append(("滑块20%交互", False, str(e)))

    # Test 4: 拖动滑块到 80%
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.8, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUT_DIR, "03_slice_80pct.png"))
        val = page.locator(".value").first.inner_text()
        log("7. 滑块 80% 交互", True, f"值: {val}")
        results.append(("滑块80%交互", True, val))
    except Exception as e:
        log("7. 滑块 80% 交互", False, str(e))
        results.append(("滑块80%交互", False, str(e)))

    # Test 5: 鼠标拖动旋转视角
    try:
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        page.mouse.move(cx + 200, cy - 100, steps=20)
        page.mouse.up()
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUT_DIR, "04_rotated_view.png"))
        log("8. 视角拖动旋转", True)
        results.append(("视角拖动旋转", True))
    except Exception as e:
        log("8. 视角拖动旋转", False, str(e))
        results.append(("视角拖动旋转", False, str(e)))

    # Test 6: 滚轮缩放
    try:
        page.mouse.wheel(0, -500)
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUT_DIR, "05_zoom_in.png"))
        log("9. 滚轮缩放", True)
        results.append(("滚轮缩放", True))
    except Exception as e:
        log("9. 滚轮缩放", False, str(e))
        results.append(("滚轮缩放", False, str(e)))

    # 汇总错误
    if console_errors:
        print("\n=== Console Errors ===")
        for e in console_errors:
            print(e)
    if page_errors:
        print("\n=== Page Errors ===")
        for e in page_errors:
            print(e)

    with open(os.path.join(OUT_DIR, "console_errors.json"), "w") as f:
        json.dump({"console_errors": console_errors, "page_errors": page_errors, "results": results}, f, ensure_ascii=False, indent=2)

    browser.close()

print("\n完成")
