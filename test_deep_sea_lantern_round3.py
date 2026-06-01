#!/usr/bin/env python3
"""深海灯笼 - 第3轮浏览器交互测试"""

import time
from playwright.sync_api import sync_playwright

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_tests():
    print("\n" + "="*80)
    print("🌊 深海灯笼 (deep-sea-lantern) - 第3轮测试")
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
        except Exception as e:
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
            issues.append(f"页面加载失败: {str(e)}")
            browser.close()
            return test_results, issues, console_errors
        
        # ========== 测试2: 初始状态（鼠标移动前） ==========
        try:
            time.sleep(1)
            page.screenshot(path=f"{img_dir}/r3_01_before_mouse.png")
            log_test("2. 初始状态截图", True, "已保存")
            test_results.append(("初始状态截图", True, "已保存"))
        except Exception as e:
            log_test("2. 初始状态截图", False, str(e))
            test_results.append(("初始状态截图", False, str(e)))
        
        # ========== 测试3: 鼠标移动后 - 灯光和浮游生物 ==========
        try:
            canvas = page.locator("canvas").first
            box = canvas.bounding_box()
            if box:
                center_x = box["x"] + box["width"] / 2
                center_y = box["y"] + box["height"] / 2
                
                page.mouse.move(center_x, center_y)
                time.sleep(1.5)
                page.screenshot(path=f"{img_dir}/r3_02_light_center.png")
                
                log_test("3. 鼠标移动后效果", True, "已截图")
                test_results.append(("鼠标移动后效果", True, "已截图"))
            else:
                log_test("3. 鼠标移动后效果", False, "无法获取canvas边界")
                test_results.append(("鼠标移动后效果", False, "边界获取失败"))
        except Exception as e:
            log_test("3. 鼠标移动后效果", False, str(e))
            test_results.append(("鼠标移动后效果", False, str(e)))
        
        # ========== 测试4: 灯光视觉效果增强验证 ==========
        try:
            box = page.locator("canvas").first.bounding_box()
            if box:
                center_x = box["x"] + box["width"] / 2
                center_y = box["y"] + box["height"] / 2
                
                for i, (ox, oy) in enumerate([(0, 0), (-180, -120), (180, 120)]):
                    page.mouse.move(center_x + ox, center_y + oy)
                    time.sleep(0.8)
                    page.screenshot(path=f"{img_dir}/r3_03_light_visual_{i}.png")
                
                log_test("4. 灯光视觉效果", True, "不同位置已截图")
                test_results.append(("灯光视觉效果", True, "已截图"))
            else:
                log_test("4. 灯光视觉效果", False, "无法进行测试")
                test_results.append(("灯光视觉效果", False, "无法测试"))
        except Exception as e:
            log_test("4. 灯光视觉效果", False, str(e))
            test_results.append(("灯光视觉效果", False, str(e)))
        
        # ========== 测试5: 背景碎片效果 ==========
        try:
            page.screenshot(path=f"{img_dir}/r3_04_background_debris.png")
            log_test("5. 背景碎片效果", True, "已截图")
            test_results.append(("背景碎片效果", True, "已截图"))
        except Exception as e:
            log_test("5. 背景碎片效果", False, str(e))
            test_results.append(("背景碎片效果", False, str(e)))
        
        # ========== 测试6: 检查控制台错误 ==========
        js_errors = [e for e in console_errors if "[error]" in e or "[pageerror]" in e]
        if len(js_errors) == 0:
            log_test("6. 浏览器控制台", True, "无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            log_test("6. 浏览器控制台", False, f"发现 {len(js_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(js_errors)}个错误"))
            issues.append(f"控制台错误: {'; '.join(js_errors[:3])}")
        
        browser.close()
    
    # 测试总结
    print("\n" + "="*80)
    print("📊 第3轮测试总结")
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
        print("🎉 所有自动化测试通过！")
    
    print("\n" + "="*80 + "\n")
    
    return test_results, issues, console_errors

if __name__ == "__main__":
    run_tests()
