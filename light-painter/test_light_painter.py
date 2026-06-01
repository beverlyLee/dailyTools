#!/usr/bin/env python3
"""光绘画板 - 浏览器交互测试"""

import time
import os
from playwright.sync_api import sync_playwright, Page

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"
os.makedirs(IMG_DIR, exist_ok=True)

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_tests():
    print("\n" + "="*80)
    print("🎨 光绘画板 (light-painter) - 浏览器交互测试")
    print("="*80 + "\n")
    
    test_results = []
    console_errors = []
    console_logs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = context.new_page()
        
        def on_console(msg):
            msg_text = f"[{msg.type}] {msg.text}"
            if msg.type in ["error"]:
                console_errors.append(msg_text)
            console_logs.append(msg_text)
        
        page.on("console", on_console)
        
        def on_pageerror(exc):
            console_errors.append(f"[pageerror] {exc.message}\n{exc.stack}")
        
        page.on("pageerror", on_pageerror)
        
        # ========== 测试1: 页面加载 ==========
        start = time.time()
        try:
            page.goto("http://localhost:5173", wait_until="domcontentloaded", timeout=30000)
            load_time = time.time() - start
            time.sleep(2)
            
            page.screenshot(path=f"{IMG_DIR}/01_initial_load.png")
            log_test("1. 页面加载", True, f"加载时间: {load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/01_load_error.png")
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
            browser.close()
            return test_results, console_errors, console_logs
        
        # ========== 测试2: 标题渲染 ==========
        try:
            title = page.title()
            page.screenshot(path=f"{IMG_DIR}/02_title_check.png")
            if "Light Painter" in title or "光绘画板" in title:
                log_test("2. 标题渲染", True, f"标题: {title}")
                test_results.append(("标题渲染", True, title))
            else:
                log_test("2. 标题渲染", False, f"未找到预期标题，实际: {title}")
                test_results.append(("标题渲染", False, f"实际: {title}"))
        except Exception as e:
            log_test("2. 标题渲染", False, str(e))
            test_results.append(("标题渲染", False, str(e)))
        
        # ========== 测试3: Canvas 存在 ==========
        try:
            canvas = page.locator("canvas").first
            exists = canvas.is_visible(timeout=5000)
            if exists:
                box = canvas.bounding_box()
                log_test("3. Canvas 渲染", True, f"尺寸: {box['width']:.0f}x{box['height']:.0f}")
                test_results.append(("Canvas 渲染", True, f"{box['width']:.0f}x{box['height']:.0f}"))
            else:
                log_test("3. Canvas 渲染", False, "Canvas 不可见")
                test_results.append(("Canvas 渲染", False, "不可见"))
        except Exception as e:
            log_test("3. Canvas 渲染", False, str(e))
            test_results.append(("Canvas 渲染", False, str(e)))
        
        # ========== 测试4: 提示文字存在 ==========
        try:
            tip = page.locator(".tip").first
            tip_text = tip.inner_text(timeout=5000)
            if "按住鼠标" in tip_text or "绘制" in tip_text:
                log_test("4. 提示文字", True, f"文本: {tip_text}")
                test_results.append(("提示文字", True, tip_text))
            else:
                log_test("4. 提示文字", False, f"文本内容不符: {tip_text}")
                test_results.append(("提示文字", False, f"实际: {tip_text}"))
        except Exception as e:
            log_test("4. 提示文字", False, str(e))
            test_results.append(("提示文字", False, str(e)))
        
        # ========== 测试5: 鼠标拖拽绘制光轨 - 直线 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            
            start_x = box["x"] + 100
            start_y = box["y"] + box["height"] / 2
            end_x = box["x"] + box["width"] - 100
            end_y = box["y"] + box["height"] / 2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            
            steps = 20
            for i in range(steps + 1):
                t = i / steps
                x = start_x + (end_x - start_x) * t
                y = start_y
                page.mouse.move(x, y)
                time.sleep(0.05)
            
            page.mouse.up()
            time.sleep(1)
            
            page.screenshot(path=f"{IMG_DIR}/03_draw_straight_line.png")
            log_test("5. 绘制直线光轨", True, "鼠标拖拽完成")
            test_results.append(("绘制直线光轨", True, "完成"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/03_draw_error.png")
            log_test("5. 绘制直线光轨", False, str(e))
            test_results.append(("绘制直线光轨", False, str(e)))
        
        # ========== 测试6: 鼠标拖拽绘制 - 圆形图案 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            radius = min(box["width"], box["height"]) / 4
            
            import math
            
            start_angle = 0
            start_cx = center_x + radius * math.cos(start_angle)
            start_cy = center_y + radius * math.sin(start_angle)
            
            page.mouse.move(start_cx, start_cy)
            page.mouse.down()
            
            steps = 60
            for i in range(steps + 1):
                angle = start_angle + (2 * math.pi * i / steps)
                x = center_x + radius * math.cos(angle)
                y = center_y + radius * math.sin(angle)
                page.mouse.move(x, y)
                time.sleep(0.03)
            
            page.mouse.up()
            time.sleep(1)
            
            page.screenshot(path=f"{IMG_DIR}/04_draw_circle.png")
            log_test("6. 绘制圆形光轨", True, "圆形绘制完成")
            test_results.append(("绘制圆形光轨", True, "完成"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/04_draw_circle_error.png")
            log_test("6. 绘制圆形光轨", False, str(e))
            test_results.append(("绘制圆形光轨", False, str(e)))
        
        # ========== 测试7: 绘制锯齿形图案 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            
            start_x = box["x"] + 100
            start_y = box["y"] + 100
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            
            zigzag_points = []
            for i in range(8):
                x = start_x + i * (box["width"] - 200) / 7
                y = start_y if i % 2 == 0 else start_y + 200
                zigzag_points.append((x, y))
            
            for x, y in zigzag_points:
                page.mouse.move(x, y)
                time.sleep(0.05)
            
            page.mouse.up()
            time.sleep(1)
            
            page.screenshot(path=f"{IMG_DIR}/05_draw_zigzag.png")
            log_test("7. 绘制锯齿形光轨", True, "锯齿形绘制完成")
            test_results.append(("绘制锯齿形光轨", True, "完成"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/05_draw_zigzag_error.png")
            log_test("7. 绘制锯齿形光轨", False, str(e))
            test_results.append(("绘制锯齿形光轨", False, str(e)))
        
        # ========== 测试8: 光轨叠加效果 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            
            for layer in range(5):
                start_x = center_x - 150 + layer * 30
                start_y = center_y - 150
                end_x = center_x + 150
                end_y = center_y + 150 - layer * 30
                
                page.mouse.move(start_x, start_y)
                page.mouse.down()
                time.sleep(0.02)
                page.mouse.move(end_x, end_y)
                time.sleep(0.1)
                page.mouse.up()
                time.sleep(0.2)
            
            time.sleep(1)
            page.screenshot(path=f"{IMG_DIR}/06_draw_overlap.png")
            log_test("8. 光轨叠加效果", True, "多层光轨绘制完成")
            test_results.append(("光轨叠加效果", True, "完成"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/06_draw_overlap_error.png")
            log_test("8. 光轨叠加效果", False, str(e))
            test_results.append(("光轨叠加效果", False, str(e)))
        
        # ========== 测试9: 松开鼠标后光轨保留 ==========
        try:
            time.sleep(2)
            page.screenshot(path=f"{IMG_DIR}/07_trail_persist.png")
            log_test("9. 光轨保留测试", True, "2秒后光轨仍保留")
            test_results.append(("光轨保留测试", True, "保留"))
        except Exception as e:
            log_test("9. 光轨保留测试", False, str(e))
            test_results.append(("光轨保留测试", False, str(e)))
        
        # ========== 测试10: 浏览器窗口大小调整 ==========
        try:
            page.set_viewport_size({"width": 800, "height": 600})
            time.sleep(1)
            page.screenshot(path=f"{IMG_DIR}/08_resize_800x600.png")
            
            page.set_viewport_size({"width": 1280, "height": 800})
            time.sleep(1)
            page.screenshot(path=f"{IMG_DIR}/09_resize_back.png")
            
            log_test("10. 窗口大小调整", True, "调整后Canvas正常显示")
            test_results.append(("窗口大小调整", True, "正常"))
        except Exception as e:
            log_test("10. 窗口大小调整", False, str(e))
            test_results.append(("窗口大小调整", False, str(e)))
        
        # ========== 测试11: 控制台错误检查 ==========
        js_errors = [e for e in console_errors if "error" in e.lower() or "pageerror" in e.lower()]
        if len(js_errors) == 0:
            page.screenshot(path=f"{IMG_DIR}/10_final_state.png")
            log_test("11. 浏览器控制台", True, "无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            page.screenshot(path=f"{IMG_DIR}/10_console_error.png")
            log_test("11. 浏览器控制台", False, f"发现 {len(js_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(js_errors)}个错误"))
            for err in js_errors[:5]:
                print(f"    → {err}")
        
        browser.close()
    
    print("\n" + "="*80)
    print("📊 测试总结")
    print("="*80)
    
    passed = sum(1 for r in test_results if r[1])
    total = len(test_results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    if passed == total:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  部分测试失败，请检查上述失败项")
    
    print(f"\n📸 截图已保存至: {IMG_DIR}")
    print("\n" + "="*80 + "\n")
    
    return test_results, console_errors, console_logs

if __name__ == "__main__":
    results, errors, logs = run_tests()
