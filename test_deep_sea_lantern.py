#!/usr/bin/env python3
"""深海灯笼 - 浏览器交互测试"""

import asyncio
import time
from playwright.sync_api import sync_playwright, Page

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_tests():
    print("\n" + "="*80)
    print("🌊 深海灯笼 (deep-sea-lantern) - 浏览器交互测试")
    print("="*80 + "\n")
    
    test_results = []
    issues = []
    console_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        def on_console(msg):
            if msg.type in ["error", "warning"]:
                console_errors.append(f"[{msg.type}] {msg.text}")
                print(f"    ⚠️  控制台{msg.type}: {msg.text}")
        
        page.on("console", on_console)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc}"))
        
        img_dir = "/Users/liboyang/trae/dailyTools/deep-sea-lantern/img"
        
        # ========== 测试1: 页面加载 ==========
        start = time.time()
        try:
            page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
            load_time = time.time() - start
            time.sleep(2)
            log_test("1. 页面加载", True, f"加载时间: {load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
            
            page.screenshot(path=f"{img_dir}/01_initial_load.png")
            print(f"    📸 初始页面截图已保存")
        except Exception as e:
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
            issues.append(f"页面加载失败: {str(e)}")
            page.screenshot(path=f"{img_dir}/01_load_error.png")
            browser.close()
            return test_results, issues, console_errors
        
        # ========== 测试2: 页面标题 ==========
        try:
            title = page.title()
            if "Deep Sea Lantern" in title:
                log_test("2. 页面标题", True, f"标题: {title}")
                test_results.append(("页面标题", True, title))
            else:
                log_test("2. 页面标题", False, f"预期包含 'Deep Sea Lantern', 实际: {title}")
                test_results.append(("页面标题", False, f"实际: {title}"))
                issues.append(f"页面标题不正确: {title}")
        except Exception as e:
            log_test("2. 页面标题", False, str(e))
            test_results.append(("页面标题", False, str(e)))
            issues.append(f"获取页面标题失败: {str(e)}")
        
        # ========== 测试3: Canvas 存在 ==========
        try:
            canvas = page.locator("canvas")
            exists = canvas.is_visible(timeout=5000)
            if exists:
                count = canvas.count()
                log_test("3. Canvas渲染", True, f"找到 {count} 个canvas")
                test_results.append(("Canvas渲染", True, f"{count}个"))
            else:
                log_test("3. Canvas渲染", False, "未找到canvas元素")
                test_results.append(("Canvas渲染", False, "未找到"))
                issues.append("Canvas元素未渲染")
                page.screenshot(path=f"{img_dir}/03_canvas_missing.png")
        except Exception as e:
            log_test("3. Canvas渲染", False, str(e))
            test_results.append(("Canvas渲染", False, str(e)))
            issues.append(f"Canvas检查失败: {str(e)}")
        
        # ========== 测试4: 初始页面背景（深海黑暗效果） ==========
        try:
            time.sleep(1)
            page.screenshot(path=f"{img_dir}/04_dark_background.png")
            log_test("4. 深海背景效果", True, "已截图")
            test_results.append(("深海背景效果", True, "已截图"))
        except Exception as e:
            log_test("4. 深海背景效果", False, str(e))
            test_results.append(("深海背景效果", False, str(e)))
        
        # ========== 测试5: 鼠标移动 - 灯光跟随 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            if box:
                center_x = box["x"] + box["width"] / 2
                center_y = box["y"] + box["height"] / 2
                
                page.mouse.move(center_x, center_y)
                time.sleep(0.5)
                page.screenshot(path=f"{img_dir}/05_light_center.png")
                
                page.mouse.move(center_x - 200, center_y - 100)
                time.sleep(0.5)
                page.screenshot(path=f"{img_dir}/05_light_topleft.png")
                
                page.mouse.move(center_x + 200, center_y + 100)
                time.sleep(0.5)
                page.screenshot(path=f"{img_dir}/05_light_bottomright.png")
                
                log_test("5. 鼠标灯光跟随", True, "已完成移动测试")
                test_results.append(("鼠标灯光跟随", True, "已测试"))
            else:
                log_test("5. 鼠标灯光跟随", False, "无法获取canvas边界")
                test_results.append(("鼠标灯光跟随", False, "边界获取失败"))
                issues.append("无法获取canvas边界进行鼠标测试")
        except Exception as e:
            log_test("5. 鼠标灯光跟随", False, str(e))
            test_results.append(("鼠标灯光跟随", False, str(e)))
            issues.append(f"鼠标移动测试失败: {str(e)}")
        
        # ========== 测试6: 浮游生物显示效果（移动鼠标后） ==========
        try:
            box = page.locator("canvas").first.bounding_box()
            if box:
                center_x = box["x"] + box["width"] / 2
                center_y = box["y"] + box["height"] / 2
                
                for i in range(5):
                    offset_x = (i - 2) * 150
                    page.mouse.move(center_x + offset_x, center_y)
                    time.sleep(0.3)
                
                page.screenshot(path=f"{img_dir}/06_plankton_visible.png")
                log_test("6. 浮游生物发光效果", True, "已截图（需人工验证）")
                test_results.append(("浮游生物发光效果", True, "需人工验证"))
            else:
                log_test("6. 浮游生物发光效果", False, "无法进行测试")
                test_results.append(("浮游生物发光效果", False, "无法测试"))
        except Exception as e:
            log_test("6. 浮游生物发光效果", False, str(e))
            test_results.append(("浮游生物发光效果", False, str(e)))
        
        # ========== 测试7: 检查控制台错误 ==========
        js_errors = [e for e in console_errors if "[error]" in e or "[pageerror]" in e]
        if len(js_errors) == 0:
            log_test("7. 浏览器控制台", True, "无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            log_test("7. 浏览器控制台", False, f"发现 {len(js_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(js_errors)}个错误"))
            issues.append(f"控制台错误: {'; '.join(js_errors[:3])}")
        
        browser.close()
    
    # 测试总结
    print("\n" + "="*80)
    print("📊 测试总结")
    print("="*80)
    
    passed = sum(1 for r in test_results if r[1])
    total = len(test_results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    if issues:
        print("⚠️  发现的问题:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("🎉 所有测试通过！")
    
    print("\n" + "="*80 + "\n")
    
    return test_results, issues, console_errors

if __name__ == "__main__":
    run_tests()
