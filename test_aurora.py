#!/usr/bin/env python3
"""aurora-dancer 北极光项目 - 浏览器交互测试"""

import time
from playwright.sync_api import sync_playwright

def run_tests():
    print("\n" + "="*80)
    print("🌌 aurora-dancer 北极光项目 - 第4轮浏览器测试")
    print("="*80 + "\n")
    
    test_results = []
    console_logs = []
    
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        # ========== 测试1: 页面加载 ==========
        start = time.time()
        try:
            page.goto("http://localhost:3000/", wait_until="networkidle", timeout=30000)
            load_time = time.time() - start
            print(f"✅ PASS | 1. 页面加载 | 加载时间: {load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
        except Exception as e:
            print(f"❌ FAIL | 1. 页面加载 | {str(e)}")
            test_results.append(("页面加载", False, str(e)))
        
        time.sleep(3)
        
        # ========== 测试2: 调试面板存在 ==========
        try:
            debug_panel = page.locator("div").filter(has_text="Aurora Debug").first
            exists = debug_panel.is_visible(timeout=5000)
            if exists:
                print(f"✅ PASS | 2. 调试面板 | 已渲染")
                test_results.append(("调试面板", True, "已渲染"))
            else:
                print(f"❌ FAIL | 2. 调试面板 | 未找到")
                test_results.append(("调试面板", False, "未找到"))
        except Exception as e:
            print(f"❌ FAIL | 2. 调试面板 | {str(e)}")
            test_results.append(("调试面板", False, str(e)))
        
        # ========== 测试3: 提取调试面板数值 ==========
        try:
            debug_text = debug_panel.inner_text(timeout=5000)
            lines = debug_text.split('\n')
            fps_value = "N/A"
            noise_value = "N/A"
            for line in lines:
                if "FPS:" in line:
                    fps_value = line.split("FPS:")[1].strip()
                if "Noise:" in line:
                    noise_value = line.split("Noise:")[1].strip()
            
            print(f"📊 调试数据 | FPS={fps_value}, Noise={noise_value}")
            test_results.append(("调试数据", True, f"FPS={fps_value}, Noise={noise_value}"))
        except Exception as e:
            print(f"❌ FAIL | 3. 调试数据 | {str(e)}")
            test_results.append(("调试数据", False, str(e)))
        
        # ========== 测试4: 等待5秒后再次检查Noise值变化 ==========
        time.sleep(5)
        try:
            debug_text2 = debug_panel.inner_text(timeout=5000)
            lines2 = debug_text2.split('\n')
            noise_value2 = "N/A"
            for line in lines2:
                if "Noise:" in line:
                    noise_value2 = line.split("Noise:")[1].strip()
            
            print(f"📊 5秒后数据 | Noise={noise_value2}")
            test_results.append(("5秒后Noise", True, f"Noise={noise_value2}"))
            
            # 检查Noise值是否在正常范围(-1.0~1.0)
            try:
                noise_float = float(noise_value2)
                if -1.0 <= noise_float <= 1.0:
                    print(f"✅ PASS | 4. Noise值范围 | 在 -1.0~1.0 之间")
                    test_results.append(("Noise值范围", True, f"{noise_float}"))
                else:
                    print(f"❌ FAIL | 4. Noise值范围 | 超出范围: {noise_float}")
                    test_results.append(("Noise值范围", False, f"超出范围: {noise_float}"))
            except:
                print(f"❌ FAIL | 4. Noise值范围 | 无法解析数值")
                test_results.append(("Noise值范围", False, "无法解析"))
        except Exception as e:
            print(f"❌ FAIL | 4. Noise值范围 | {str(e)}")
            test_results.append(("Noise值范围", False, str(e)))
        
        # ========== 测试5: 控制台错误检查 ==========
        js_errors = [e for e in console_logs if "[error]" in e.lower() or "error" in e.lower()]
        if len(js_errors) == 0:
            print(f"✅ PASS | 5. 浏览器控制台 | 无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            print(f"❌ FAIL | 5. 浏览器控制台 | 发现 {len(js_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(js_errors)}个错误"))
            for err in js_errors[:5]:
                print(f"    → {err}")
        
        print("\n📝 完整控制台日志:")
        for log in console_logs[:10]:
            print(f"  {log}")
        
        # 截图保存
        screenshot_path = "/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round4-main.png"
        page.screenshot(path=screenshot_path)
        print(f"\n📸 截图已保存: {screenshot_path}")
        
        # 5秒后再截图看动态效果
        time.sleep(5)
        screenshot_path2 = "/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round4-8s-later.png"
        page.screenshot(path=screenshot_path2)
        print(f"📸 8秒后截图已保存: {screenshot_path2}")
        
        browser.close()
    
    # 测试总结
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
    
    print("\n" + "="*80 + "\n")
    
    return test_results, console_logs

if __name__ == "__main__":
    run_tests()
