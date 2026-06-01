#!/usr/bin/env python3
"""molecular-kitchen 第4轮 浏览器交互测试"""
import os
import time
import json
from playwright.sync_api import sync_playwright

OUT_DIR = "/Users/liboyang/trae/dailyTools/molecular-kitchen/img"
os.makedirs(OUT_DIR, exist_ok=True)

URL = "http://localhost:5173/"

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
        time.sleep(2.5)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_01_initial.png"))
        log("1. 页面加载", True, "networkidle")
        results.append(("页面加载", True))
    except Exception as e:
        log("1. 页面加载", False, str(e))
        results.append(("页面加载", False, str(e)))

    # Test 2: 基础元素
    try:
        h1 = page.locator("h1").first.inner_text(timeout=5000)
        log("2. 标题渲染", "分子厨房" in h1, f"标题: {h1}")
        results.append(("标题渲染", "分子厨房" in h1, h1))

        slider = page.locator("input[type=range]").first
        exists = slider.is_visible(timeout=5000)
        log("3. 切肉滑块存在", exists)
        results.append(("切肉滑块存在", exists))

        val = page.locator(".value").first.inner_text(timeout=5000)
        log("4. 初始百分比", "%" in val, f"值: {val}")
        results.append(("初始百分比", "%" in val, val))

        canvas = page.locator("canvas").first
        canvas_exists = canvas.is_visible(timeout=5000)
        log("5. 3D 画布存在", canvas_exists)
        results.append(("3D画布存在", canvas_exists))
    except Exception as e:
        log("基础元素", False, str(e))
        results.append(("基础元素", False, str(e)))

    # Test 3: 切到底部 (10%)
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.1, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.1, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_02_slice_10pct.png"))
        val = page.locator(".value").first.inner_text()
        log("6. 滑块 10%", True, f"值: {val}")
        results.append(("滑块10%", True, val))
    except Exception as e:
        log("6. 滑块 10%", False, str(e))
        results.append(("滑块10%", False, str(e)))

    # Test 4: 切到中间 (50%)
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.1, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_03_slice_50pct.png"))
        val = page.locator(".value").first.inner_text()
        log("7. 滑块 50%", True, f"值: {val}")
        results.append(("滑块50%", True, val))
    except Exception as e:
        log("7. 滑块 50%", False, str(e))
        results.append(("滑块50%", False, str(e)))

    # Test 5: 切到顶部 (90%)
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.9, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_04_slice_90pct.png"))
        val = page.locator(".value").first.inner_text()
        log("8. 滑块 90%", True, f"值: {val}")
        results.append(("滑块90%", True, val))
    except Exception as e:
        log("8. 滑块 90%", False, str(e))
        results.append(("滑块90%", False, str(e)))

    # Test 6: 斜视角 (90%)
    try:
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        page.mouse.move(cx - 350, cy + 80, steps=30)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_05_angled_90pct.png"))
        log("9. 斜视角 90%", True)
        results.append(("斜视角90%", True))
    except Exception as e:
        log("9. 斜视角 90%", False, str(e))
        results.append(("斜视角90%", False, str(e)))

    # Test 7: 切到 25% 检查切面
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.9, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.25, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_06_angled_25pct.png"))
        val = page.locator(".value").first.inner_text()
        log("10. 斜视角+25%", True, f"值: {val}")
        results.append(("斜视角25%", True, val))
    except Exception as e:
        log("10. 斜视角+25%", False, str(e))
        results.append(("斜视角25%", False, str(e)))

    # Test 8: 滚轮近景，观察纤维细节
    try:
        page.mouse.wheel(0, -1200)
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_07_zoom_in.png"))
        log("11. 滚轮缩放", True)
        results.append(("滚轮缩放", True))
    except Exception as e:
        log("11. 滚轮缩放", False, str(e))
        results.append(("滚轮缩放", False, str(e)))

    # Test 9: 顶视角看顶盖
    try:
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        page.mouse.move(cx + 400, cy - 200, steps=30)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_08_top_view.png"))
        log("12. 顶视角", True)
        results.append(("顶视角", True))
    except Exception as e:
        log("12. 顶视角", False, str(e))
        results.append(("顶视角", False, str(e)))

    # Test 10: 底部与盘子衔接检查
    try:
        slider = page.locator("input[type=range]").first
        box = slider.bounding_box()
        page.mouse.move(box["x"] + box["width"] * 0.9, box["y"] + box["height"] / 2)
        page.mouse.down()
        page.mouse.move(box["x"] + box["width"] * 0.08, box["y"] + box["height"] / 2)
        page.mouse.up()
        time.sleep(1.0)
        # 转到侧面
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        page.mouse.move(cx - 100, cy + 50, steps=20)
        page.mouse.up()
        time.sleep(1.0)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_09_bottom_plate.png"))
        val = page.locator(".value").first.inner_text()
        log("13. 底部接盘子", True, f"值: {val}")
        results.append(("底部接盘子", True, val))
    except Exception as e:
        log("13. 底部接盘子", False, str(e))
        results.append(("底部接盘子", False, str(e)))

    # Test 11: 盘子表面是否干净
    try:
        # 滚远看盘子
        page.mouse.wheel(0, 800)
        time.sleep(0.8)
        page.screenshot(path=os.path.join(OUT_DIR, "r4_10_plate_surface.png"))
        log("14. 盘子表面检查", True)
        results.append(("盘子表面", True))
    except Exception as e:
        log("14. 盘子表面", False, str(e))
        results.append(("盘子表面", False, str(e)))

    # 汇总错误
    if console_errors:
        print("\n=== Console Errors ===")
        for e in console_errors:
            print(e)
    if page_errors:
        print("\n=== Page Errors ===")
        for e in page_errors:
            print(e)

    with open(os.path.join(OUT_DIR, "r4_console_errors.json"), "w") as f:
        json.dump({"console_errors": console_errors, "page_errors": page_errors, "results": results}, f, ensure_ascii=False, indent=2)

    browser.close()

print("\n完成")
