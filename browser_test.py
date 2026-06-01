#!/usr/bin/env python3
"""二手房价格监控系统 - 真实浏览器交互测试"""

import asyncio
import time
from playwright.sync_api import sync_playwright, Page

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_tests():
    print("\n" + "="*80)
    print("🏠 二手房价格监控系统 - 浏览器交互测试")
    print("="*80 + "\n")
    
    test_results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        
        # ========== 测试1: 页面加载 ==========
        start = time.time()
        try:
            page.goto("http://127.0.0.1:8050", wait_until="networkidle", timeout=30000)
            load_time = time.time() - start
            log_test("1. 页面加载", True, f"加载时间: {load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
        except Exception as e:
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
        
        time.sleep(3)
        
        # ========== 测试2: 标题渲染 ==========
        try:
            title = page.locator("h1").first.inner_text(timeout=5000)
            if "二手房" in title:
                log_test("2. 标题渲染", True, f"标题: {title}")
                test_results.append(("标题渲染", True, title))
            else:
                log_test("2. 标题渲染", False, f"未找到预期标题，实际: {title}")
                test_results.append(("标题渲染", False, f"实际: {title}"))
        except Exception as e:
            log_test("2. 标题渲染", False, str(e))
            test_results.append(("标题渲染", False, str(e)))
        
        # ========== 测试3: 城市下拉框存在 ==========
        try:
            dropdown = page.locator(".Select-control").first
            exists = dropdown.is_visible(timeout=5000)
            if exists:
                log_test("3. 城市下拉框存在", True, "已渲染")
                test_results.append(("城市下拉框存在", True, "已渲染"))
            else:
                log_test("3. 城市下拉框存在", False, "未找到")
                test_results.append(("城市下拉框存在", False, "未找到"))
        except Exception as e:
            log_test("3. 城市下拉框存在", False, str(e))
            test_results.append(("城市下拉框存在", False, str(e)))
        
        # ========== 测试4: 点击切换城市 (北京市 -> 上海市) ==========
        try:
            dropdown.click()
            time.sleep(0.5)
            
            # 选择上海
            shanghai_option = page.locator(".Select-option", has_text="上海市").first
            shanghai_option.click()
            time.sleep(2)
            
            # 检查数据是否更新
            summary_text = page.locator(".card-body").first.inner_text(timeout=5000)
            if "上海" in summary_text or "上海市" in summary_text:
                log_test("4. 城市切换交互", True, "成功切换到上海市")
                test_results.append(("城市切换交互", True, "上海市"))
            else:
                log_test("4. 城市切换交互", False, "数据未更新或更新延迟")
                test_results.append(("城市切换交互", False, "数据未更新"))
        except Exception as e:
            log_test("4. 城市切换交互", False, str(e))
            test_results.append(("城市切换交互", False, str(e)))
        
        # ========== 测试5: 切换到深圳市 ==========
        try:
            dropdown.click()
            time.sleep(0.5)
            
            sz_option = page.locator(".Select-option", has_text="深圳市").first
            sz_option.click()
            time.sleep(2)
            
            summary_text = page.locator(".card-body").first.inner_text(timeout=5000)
            if "深圳" in summary_text or "深圳市" in summary_text:
                log_test("5. 切换到深圳市", True, "成功切换到深圳市")
                test_results.append(("切换到深圳市", True, "深圳市"))
            else:
                log_test("5. 切换到深圳市", False, "数据未更新")
                test_results.append(("切换到深圳市", False, "数据未更新"))
        except Exception as e:
            log_test("5. 切换到深圳市", False, str(e))
            test_results.append(("切换到深圳市", False, str(e)))
        
        # ========== 测试6: 房价地图存在 ==========
        try:
            # 查找地图容器 (Plotly图表)
            map_chart = page.locator(".js-plotly-plot").nth(0)
            visible = map_chart.is_visible(timeout=5000)
            if visible:
                log_test("6. 房价地图渲染", True, "图表已加载")
                test_results.append(("房价地图渲染", True, "已加载"))
            else:
                log_test("6. 房价地图渲染", False, "不可见")
                test_results.append(("房价地图渲染", False, "不可见"))
        except Exception as e:
            log_test("6. 房价地图渲染", False, str(e))
            test_results.append(("房价地图渲染", False, str(e)))
        
        # ========== 测试7: 历史趋势图存在 ==========
        try:
            trend_chart = page.locator(".js-plotly-plot").nth(1)
            visible = trend_chart.is_visible(timeout=5000)
            if visible:
                log_test("7. 历史趋势图渲染", True, "图表已加载")
                test_results.append(("历史趋势图渲染", True, "已加载"))
            else:
                log_test("7. 历史趋势图渲染", False, "不可见")
                test_results.append(("历史趋势图渲染", False, "不可见"))
        except Exception as e:
            log_test("7. 历史趋势图渲染", False, str(e))
            test_results.append(("历史趋势图渲染", False, str(e)))
        
        # ========== 测试8: 环比柱状图存在 ==========
        try:
            mom_chart = page.locator(".js-plotly-plot").nth(2)
            visible = mom_chart.is_visible(timeout=5000)
            if visible:
                log_test("8. 环比柱状图渲染", True, "图表已加载")
                test_results.append(("环比柱状图渲染", True, "已加载"))
            else:
                log_test("8. 环比柱状图渲染", False, "不可见")
                test_results.append(("环比柱状图渲染", False, "不可见"))
        except Exception as e:
            log_test("8. 环比柱状图渲染", False, str(e))
            test_results.append(("环比柱状图渲染", False, str(e)))
        
        # ========== 测试9: 热门/冷门区域列表 ==========
        try:
            hot_districts = page.locator("ul").nth(0).inner_text(timeout=5000)
            cold_districts = page.locator("ul").nth(1).inner_text(timeout=5000)
            if hot_districts and len(hot_districts) > 10:
                log_test("9. 热门区域列表", True, f"找到 {len(hot_districts.split(chr(10)))} 项")
                test_results.append(("热门区域列表", True, "正常"))
            else:
                log_test("9. 热门区域列表", False, "内容为空")
                test_results.append(("热门区域列表", False, "空"))
        except Exception as e:
            log_test("9. 热门区域列表", False, str(e))
            test_results.append(("热门区域列表", False, str(e)))
        
        # ========== 测试10: 购房推荐卡片 ==========
        try:
            rec_cards = page.locator(".card").count()
            if rec_cards >= 3:
                log_test("10. 购房推荐卡片", True, f"找到 {rec_cards} 张卡片")
                test_results.append(("购房推荐卡片", True, f"{rec_cards}张"))
            else:
                log_test("10. 购房推荐卡片", False, f"仅找到 {rec_cards} 张")
                test_results.append(("购房推荐卡片", False, f"{rec_cards}张"))
        except Exception as e:
            log_test("10. 购房推荐卡片", False, str(e))
            test_results.append(("购房推荐卡片", False, str(e)))
        
        # ========== 测试11: 图表hover交互 ==========
        try:
            # 鼠标hover到趋势图数据点
            trend_chart = page.locator(".js-plotly-plot").nth(1)
            trend_chart.hover(position={"x": 200, "y": 150})
            time.sleep(1)
            
            log_test("11. 图表hover交互", True, "交互正常")
            test_results.append(("图表hover交互", True, "无异常"))
        except Exception as e:
            log_test("11. 图表hover交互", False, str(e))
            test_results.append(("图表hover交互", False, str(e)))
        
        # ========== 测试12: 控制台错误检查 ==========
        js_errors = [e for e in console_errors if "[error]" in e]
        if len(js_errors) == 0:
            log_test("12. 浏览器控制台", True, "无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            log_test("12. 浏览器控制台", False, f"发现 {len(js_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(js_errors)}个错误"))
            for err in js_errors[:3]:
                print(f"    → {err}")
        
        # 截图保存
        screenshot_path = "/Users/liboyang/trae/dailyTools/e2e_test_screenshot.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 完整页面截图已保存: {screenshot_path}")
        
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

if __name__ == "__main__":
    run_tests()
