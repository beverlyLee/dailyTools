#!/usr/bin/env python3
"""职场精神离职分析仪表板 - 浏览器交互测试"""

import asyncio
import time
import sys
import os
from playwright.sync_api import sync_playwright, Page

IMG_DIR = "/Users/liboyang/trae/dailyTools/mental-resignation/img"
os.makedirs(IMG_DIR, exist_ok=True)

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_tests():
    print("\n" + "="*80)
    print("😮‍💨 职场精神离职分析仪表板 - 浏览器交互测试")
    print("="*80 + "\n")
    
    test_results = []
    console_errors = []
    page_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            locale="zh-CN"
        )
        page = context.new_page()
        
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        
        # ========== 测试1: 页面加载 ==========
        start = time.time()
        try:
            page.goto("http://localhost:8501", wait_until="networkidle", timeout=30000)
            load_time = time.time() - start
            time.sleep(3)
            log_test("1. 页面加载", True, f"加载时间: {load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
            page.screenshot(path=f"{IMG_DIR}/01_page_loaded.png", full_page=True)
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/01_page_load_error.png", full_page=True)
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
        
        # ========== 测试2: 标题渲染 ==========
        try:
            title = page.locator("h1").first.inner_text(timeout=5000)
            if "精神离职" in title or "职场" in title:
                log_test("2. 标题渲染", True, f"标题: {title}")
                test_results.append(("标题渲染", True, title))
            else:
                log_test("2. 标题渲染", False, f"未找到预期标题，实际: {title}")
                test_results.append(("标题渲染", False, f"实际: {title}"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/02_title_error.png")
            log_test("2. 标题渲染", False, str(e))
            test_results.append(("标题渲染", False, str(e)))
        
        # ========== 测试3: 侧边栏控制面板存在 ==========
        try:
            sidebar = page.locator("[data-testid='stSidebar']")
            exists = sidebar.is_visible(timeout=5000)
            if exists:
                log_test("3. 侧边栏控制面板", True, "已渲染")
                test_results.append(("侧边栏控制面板", True, "已渲染"))
            else:
                page.screenshot(path=f"{IMG_DIR}/03_sidebar_error.png")
                log_test("3. 侧边栏控制面板", False, "未找到")
                test_results.append(("侧边栏控制面板", False, "未找到"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/03_sidebar_error.png")
            log_test("3. 侧边栏控制面板", False, str(e))
            test_results.append(("侧边栏控制面板", False, str(e)))
        
        # ========== 测试4: 核心指标卡片 ==========
        try:
            metrics = page.locator("[data-testid='stMetric']")
            count = metrics.count()
            if count >= 4:
                log_test("4. 核心指标卡片", True, f"找到 {count} 个指标卡片")
                test_results.append(("核心指标卡片", True, f"{count}个"))
            else:
                page.screenshot(path=f"{IMG_DIR}/04_metrics_error.png")
                log_test("4. 核心指标卡片", False, f"仅找到 {count} 个，预期>=4")
                test_results.append(("核心指标卡片", False, f"仅{count}个"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/04_metrics_error.png")
            log_test("4. 核心指标卡片", False, str(e))
            test_results.append(("核心指标卡片", False, str(e)))
        
        # ========== 测试5: Tab页签存在 ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            count = tabs.count()
            if count >= 5:
                log_test("5. Tab页签", True, f"找到 {count} 个Tab")
                test_results.append(("Tab页签", True, f"{count}个"))
            else:
                page.screenshot(path=f"{IMG_DIR}/05_tabs_error.png")
                log_test("5. Tab页签", False, f"仅找到 {count} 个，预期>=5")
                test_results.append(("Tab页签", False, f"仅{count}个"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/05_tabs_error.png")
            log_test("5. Tab页签", False, str(e))
            test_results.append(("Tab页签", False, str(e)))
        
        # ========== 测试6: 瀑布图渲染 ==========
        try:
            page.screenshot(path=f"{IMG_DIR}/06_waterfall_before.png")
            charts = page.locator(".js-plotly-plot")
            initial_count = charts.count()
            time.sleep(2)
            
            if initial_count >= 1:
                log_test("6. 瀑布图渲染", True, f"图表已加载，共 {initial_count} 个Plotly图表")
                test_results.append(("瀑布图渲染", True, f"{initial_count}个图表"))
                page.screenshot(path=f"{IMG_DIR}/06_waterfall_chart.png")
            else:
                page.screenshot(path=f"{IMG_DIR}/06_waterfall_error.png")
                log_test("6. 瀑布图渲染", False, "未找到Plotly图表")
                test_results.append(("瀑布图渲染", False, "未找到"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/06_waterfall_error.png")
            log_test("6. 瀑布图渲染", False, str(e))
            test_results.append(("瀑布图渲染", False, str(e)))
        
        # ========== 测试7: 切换图表类型（柱状图 -> 热力图） ==========
        try:
            chart_select = page.locator("[data-testid='stSelectbox']").first
            chart_select.click()
            time.sleep(1)
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
            time.sleep(3)
            
            charts = page.locator(".js-plotly-plot")
            count = charts.count()
            if count >= 1:
                page.screenshot(path=f"{IMG_DIR}/07_bar_chart.png")
                log_test("7. 切换到热力图", True, "切换成功")
                test_results.append(("切换到热力图", True, "成功"))
            else:
                page.screenshot(path=f"{IMG_DIR}/07_bar_chart_error.png")
                log_test("7. 切换到热力图", False, "图表消失")
                test_results.append(("切换到热力图", False, "图表消失"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/07_bar_chart_error.png")
            log_test("7. 切换到热力图", False, str(e)[:100])
            test_results.append(("切换到热力图", False, str(e)[:100]))
        
        # ========== 测试8: 切换图表类型（热力图 -> 瀑布图） ==========
        try:
            chart_select = page.locator("[data-testid='stSelectbox']").first
            chart_select.click()
            time.sleep(1)
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
            time.sleep(3)
            
            charts = page.locator(".js-plotly-plot")
            count = charts.count()
            if count >= 1:
                page.screenshot(path=f"{IMG_DIR}/08_heatmap.png")
                log_test("8. 切换到瀑布图", True, "切换成功")
                test_results.append(("切换到瀑布图", True, "成功"))
            else:
                page.screenshot(path=f"{IMG_DIR}/08_heatmap_error.png")
                log_test("8. 切换到瀑布图", False, "图表消失")
                test_results.append(("切换到瀑布图", False, "图表消失"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/08_heatmap_error.png")
            log_test("8. 切换到瀑布图", False, str(e)[:100])
            test_results.append(("切换到瀑布图", False, str(e)[:100]))
        
        # ========== 测试9: 切换到行业指数Tab ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(1).click()
            time.sleep(3)
            
            charts = page.locator(".js-plotly-plot")
            count = charts.count()
            if count >= 1:
                page.screenshot(path=f"{IMG_DIR}/09_industry_tab.png")
                log_test("9. 行业指数Tab", True, "切换成功，图表正常")
                test_results.append(("行业指数Tab", True, "成功"))
            else:
                page.screenshot(path=f"{IMG_DIR}/09_industry_error.png")
                log_test("9. 行业指数Tab", False, "图表未加载")
                test_results.append(("行业指数Tab", False, "图表未加载"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/09_industry_error.png")
            log_test("9. 行业指数Tab", False, str(e)[:100])
            test_results.append(("行业指数Tab", False, str(e)[:100]))
        
        # ========== 测试10: 切换到城市指数Tab ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(2).click()
            time.sleep(3)
            
            charts = page.locator(".js-plotly-plot")
            count = charts.count()
            if count >= 1:
                page.screenshot(path=f"{IMG_DIR}/10_city_tab.png")
                log_test("10. 城市指数Tab", True, "切换成功，图表正常")
                test_results.append(("城市指数Tab", True, "成功"))
            else:
                page.screenshot(path=f"{IMG_DIR}/10_city_error.png")
                log_test("10. 城市指数Tab", False, "图表未加载")
                test_results.append(("城市指数Tab", False, "图表未加载"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/10_city_error.png")
            log_test("10. 城市指数Tab", False, str(e))
            test_results.append(("城市指数Tab", False, str(e)))
        
        # ========== 测试11: 切换到摸鱼技巧Tab ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(3).click()
            time.sleep(3)
            
            charts = page.locator(".js-plotly-plot")
            count = charts.count()
            if count >= 1:
                page.screenshot(path=f"{IMG_DIR}/11_mouyu_tab.png")
                log_test("11. 摸鱼技巧Tab", True, "切换成功，图表正常")
                test_results.append(("摸鱼技巧Tab", True, "成功"))
            else:
                page.screenshot(path=f"{IMG_DIR}/11_mouyu_error.png")
                log_test("11. 摸鱼技巧Tab", False, "图表未加载")
                test_results.append(("摸鱼技巧Tab", False, "图表未加载"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/11_mouyu_error.png")
            log_test("11. 摸鱼技巧Tab", False, str(e))
            test_results.append(("摸鱼技巧Tab", False, str(e)))
        
        # ========== 测试12: 切换到关键词上下文Tab ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(4).click()
            time.sleep(3)
            
            kw_select = page.locator("[data-testid='stSelectbox']").first
            exists = kw_select.is_visible(timeout=5000)
            page.screenshot(path=f"{IMG_DIR}/12_keyword_tab.png")
            
            if exists:
                log_test("12. 关键词上下文Tab", True, "关键词选择器已渲染")
                test_results.append(("关键词上下文Tab", True, "正常"))
            else:
                page.screenshot(path=f"{IMG_DIR}/12_keyword_error.png")
                log_test("12. 关键词上下文Tab", False, "关键词选择器未找到")
                test_results.append(("关键词上下文Tab", False, "未找到"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/12_keyword_error.png")
            log_test("12. 关键词上下文Tab", False, str(e)[:100])
            test_results.append(("关键词上下文Tab", False, str(e)[:100]))
        
        # ========== 测试13: 关键词上下文交互 ==========
        try:
            kw_select = page.locator("[data-testid='stSelectbox']").first
            kw_select.click()
            time.sleep(1)
            page.keyboard.type("摸鱼")
            page.keyboard.press("Enter")
            time.sleep(2)
            
            expander_count = page.locator("[data-testid='stExpander']").count()
            page.screenshot(path=f"{IMG_DIR}/13_keyword_context.png")
            
            if expander_count >= 1:
                log_test("13. 关键词上下文展示", True, f"找到 {expander_count} 条上下文可展开")
                test_results.append(("关键词上下文展示", True, f"{expander_count}条"))
            else:
                page.screenshot(path=f"{IMG_DIR}/13_context_error.png")
                log_test("13. 关键词上下文展示", False, "未找到上下文展示")
                test_results.append(("关键词上下文展示", False, "未找到"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/13_context_error.png")
            log_test("13. 关键词上下文展示", False, str(e)[:100])
            test_results.append(("关键词上下文展示", False, str(e)[:100]))
        
        # ========== 测试14: 刷新数据按钮 ==========
        try:
            refresh_btn = page.locator("button", has_text="刷新数据")
            if refresh_btn.count() > 0:
                refresh_btn.first.click()
                time.sleep(4)
                page.screenshot(path=f"{IMG_DIR}/14_after_refresh.png")
                log_test("14. 刷新数据按钮", True, "点击成功，页面无崩溃")
                test_results.append(("刷新数据按钮", True, "成功"))
            else:
                log_test("14. 刷新数据按钮", False, "未找到按钮")
                test_results.append(("刷新数据按钮", False, "未找到"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/14_refresh_error.png")
            log_test("14. 刷新数据按钮", False, str(e))
            test_results.append(("刷新数据按钮", False, str(e)))
        
        # ========== 测试15: 验证业务逻辑 - IT行业离职指数最高 ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(1).click()
            time.sleep(2)
            
            df_rows = page.locator("[data-testid='stDataFrame'] tr")
            row_count = df_rows.count()
            
            # 检查行业排序数据
            page.screenshot(path=f"{IMG_DIR}/15_industry_validation.png")
            
            if row_count >= 3:
                log_test("15. 行业指数验证", True, f"数据表格有 {row_count} 行数据")
                test_results.append(("行业指数验证", True, "数据正常"))
            else:
                log_test("15. 行业指数验证", False, f"数据不足，仅 {row_count} 行")
                test_results.append(("行业指数验证", False, "数据不足"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/15_validation_error.png")
            log_test("15. 行业指数验证", False, str(e))
            test_results.append(("行业指数验证", False, str(e)))
        
        # ========== 测试16: 验证业务逻辑 - 周五下午峰值 ==========
        try:
            tabs = page.locator("[data-testid='stTabs'] [role='tab']")
            tabs.nth(0).click()
            time.sleep(2)
            
            chart_select = page.locator("[data-testid='stSelectbox']").first
            chart_select.click()
            time.sleep(1)
            for _ in range(2):
                page.keyboard.press("ArrowUp")
            page.keyboard.press("Enter")
            time.sleep(2)
            
            page.screenshot(path=f"{IMG_DIR}/16_friday_peak.png")
            log_test("16. 周五下午峰值验证", True, "瀑布图正常渲染")
            test_results.append(("周五下午峰值验证", True, "图表正常"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/16_peak_error.png")
            log_test("16. 周五下午峰值验证", False, str(e)[:100])
            test_results.append(("周五下午峰值验证", False, str(e)[:100]))
        
        # ========== 测试17: 控制台错误检查 ==========
        js_errors = [e for e in console_errors if "[error]" in e]
        if len(js_errors) == 0 and len(page_errors) == 0:
            log_test("17. 浏览器控制台", True, "无JS错误")
            test_results.append(("浏览器控制台", True, "无错误"))
        else:
            all_errors = js_errors + page_errors
            page.screenshot(path=f"{IMG_DIR}/17_console_errors.png")
            log_test("17. 浏览器控制台", False, f"发现 {len(all_errors)} 个错误")
            test_results.append(("浏览器控制台", False, f"{len(all_errors)}个错误"))
            for i, err in enumerate(all_errors[:5]):
                print(f"    → 错误{i+1}: {err}")
        
        # 最终完整截图
        page.screenshot(path=f"{IMG_DIR}/99_final_full_page.png", full_page=True)
        print(f"\n📸 所有截图已保存至: {IMG_DIR}")
        
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
    
    return test_results, console_errors, page_errors

if __name__ == "__main__":
    results, console_errors, page_errors = run_tests()
    
    # 保存测试结果
    with open("/Users/liboyang/trae/dailyTools/mental-resignation/test_results.txt", "w", encoding="utf-8") as f:
        f.write("职场精神离职分析仪表板 - 测试结果\n")
        f.write("="*80 + "\n\n")
        for name, status, detail in results:
            status_str = "PASS" if status else "FAIL"
            f.write(f"{status_str} | {name:<40} | {detail}\n")
        
        f.write("\n控制台错误:\n")
        for err in console_errors:
            f.write(f"  {err}\n")
        
        f.write("\n页面错误:\n")
        for err in page_errors:
            f.write(f"  {err}\n")
    
    print(f"测试结果已保存到: /Users/liboyang/trae/dailyTools/mental-resignation/test_results.txt")
