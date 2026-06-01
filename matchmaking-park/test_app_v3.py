import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = os.path.join(os.path.dirname(__file__), "img")
os.makedirs(IMG_DIR, exist_ok=True)

async def test_matchmaking_app():
    errors = []
    screenshots = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        
        try:
            await page.goto("http://localhost:8502", timeout=60000)
            await page.wait_for_load_state("networkidle", timeout=30000)
            await asyncio.sleep(10)
            
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: errors.append(f"页面错误: {str(exc)}"))
            
            await page.screenshot(path=os.path.join(IMG_DIR, "1_homepage.png"), full_page=True)
            screenshots.append("1_homepage.png - 首页加载")
            
            html_content = await page.content()
            if "北京" in html_content:
                screenshots.append("页面包含'北京'文字")
            if "上海" in html_content:
                screenshots.append("页面包含'上海'文字")
            
            sidebar_select = page.locator('[data-testid="stSidebar"] select')
            select_count = await sidebar_select.count()
            
            if select_count == 0:
                all_selects = page.locator('select')
                select_count = await all_selects.count()
                
                if select_count > 0:
                    city_select = all_selects.first
                else:
                    st_selectbox = page.locator('[data-testid="stSelectbox"]')
                    if await st_selectbox.count() > 0:
                        city_select = st_selectbox.locator('select').first
                        select_count = await city_select.count()
                    else:
                        select_count = 0
                        city_select = None
            else:
                city_select = sidebar_select.first
            
            if select_count > 0 and city_select:
                await asyncio.sleep(2)
                
                try:
                    options = await city_select.locator('option').all_inner_texts()
                    screenshots.append(f"可用城市选项: {options}")
                    
                    await city_select.select_option("北京")
                    await asyncio.sleep(8)
                    await page.screenshot(path=os.path.join(IMG_DIR, "2_beijing_wordcloud.png"), full_page=True)
                    screenshots.append("2_beijing_wordcloud.png - 北京词云图")
                except Exception as e:
                    errors.append(f"选择北京城市失败: {str(e)}")
                
                try:
                    await city_select.select_option("上海")
                    await asyncio.sleep(8)
                    await page.screenshot(path=os.path.join(IMG_DIR, "3_shanghai_wordcloud.png"), full_page=True)
                    screenshots.append("3_shanghai_wordcloud.png - 上海词云图")
                except Exception as e:
                    errors.append(f"选择上海城市失败: {str(e)}")
            else:
                errors.append("未找到城市选择下拉框")
                await page.screenshot(path=os.path.join(IMG_DIR, "1b_debug_no_select.png"), full_page=True)
                screenshots.append("1b_debug_no_select.png - 调试截图(无选择框)")
            
            stats_tab = page.get_by_text("统计数据")
            if await stats_tab.count() > 0:
                await stats_tab.click()
                await asyncio.sleep(6)
                await page.screenshot(path=os.path.join(IMG_DIR, "4_statistics.png"), full_page=True)
                screenshots.append("4_statistics.png - 统计数据标签页")
            else:
                errors.append("未找到'统计数据'标签页")
            
            raw_data_tab = page.get_by_text("原始数据")
            if await raw_data_tab.count() > 0:
                await raw_data_tab.click()
                await asyncio.sleep(5)
                await page.screenshot(path=os.path.join(IMG_DIR, "5_raw_data.png"), full_page=True)
                screenshots.append("5_raw_data.png - 原始数据标签页")
            else:
                errors.append("未找到'原始数据'标签页")
            
            wordcloud_tab = page.get_by_text("词云图")
            if await wordcloud_tab.count() > 0:
                await wordcloud_tab.click()
                await asyncio.sleep(4)
                await page.screenshot(path=os.path.join(IMG_DIR, "6_wordcloud_tab.png"), full_page=True)
                screenshots.append("6_wordcloud_tab.png - 词云图标签页")
            else:
                errors.append("未找到'词云图'标签页")
            
            if console_errors:
                errors.append(f"控制台错误: {'; '.join(console_errors[:5])}")
            
        except Exception as e:
            errors.append(f"页面访问失败: {str(e)}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "error_load.png"), full_page=True)
                screenshots.append("error_load.png - 加载错误截图")
            except:
                pass
        
        await browser.close()
    
    return errors, screenshots

if __name__ == "__main__":
    errors, screenshots = asyncio.run(test_matchmaking_app())
    
    print("=" * 60)
    print("测试结果")
    print("=" * 60)
    print(f"\n截图文件 ({len(screenshots)} 张):")
    for s in screenshots:
        print(f"  ✓ {s}")
    
    if errors:
        print(f"\n发现的问题 ({len(errors)} 个):")
        for e in errors:
            print(f"  ✗ {e}")
    else:
        print("\n✓ 未发现明显错误")
    
    print("\n" + "=" * 60)
