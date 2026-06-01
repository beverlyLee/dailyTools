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
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()
        
        console_errors = []
        page_errors = []
        
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        
        try:
            await page.goto("http://localhost:8505", timeout=60000)
            await page.wait_for_load_state("networkidle", timeout=30000)
            await asyncio.sleep(15)
            
            await page.screenshot(path=os.path.join(IMG_DIR, "r4_1_homepage.png"), full_page=True)
            screenshots.append("r4_1_homepage.png - 首页加载")
            
            page_title = await page.title()
            if "城市公园相亲角" not in page_title:
                errors.append(f"页面标题不正确: {page_title}")
            
            selectbox_click_area = page.locator('[data-testid="stSidebar"] [data-testid="stSelectbox"]').first
            if await selectbox_click_area.count() > 0:
                await asyncio.sleep(2)
                
                try:
                    await selectbox_click_area.click()
                    await asyncio.sleep(2)
                    
                    beijing_option = page.get_by_text("北京", exact=True).last
                    if await beijing_option.count() > 0:
                        await beijing_option.click()
                        await asyncio.sleep(8)
                        await page.screenshot(path=os.path.join(IMG_DIR, "r4_2_beijing_wordcloud.png"), full_page=True)
                        screenshots.append("r4_2_beijing_wordcloud.png - 北京词云图")
                        
                        page_content = await page.content()
                        if "京户" not in page_content:
                            errors.append("北京词云图中未检测到'京户'关键词")
                    else:
                        errors.append("未找到'北京'选项")
                except Exception as e:
                    errors.append(f"选择北京城市失败: {str(e)}")
                
                await asyncio.sleep(2)
                try:
                    await selectbox_click_area.click()
                    await asyncio.sleep(2)
                    
                    shanghai_option = page.get_by_text("上海", exact=True).last
                    if await shanghai_option.count() > 0:
                        await shanghai_option.click()
                        await asyncio.sleep(8)
                        await page.screenshot(path=os.path.join(IMG_DIR, "r4_3_shanghai_wordcloud.png"), full_page=True)
                        screenshots.append("r4_3_shanghai_wordcloud.png - 上海词云图")
                        
                        page_content = await page.content()
                        if "有房" not in page_content:
                            errors.append("上海词云图中未检测到'有房'关键词")
                    else:
                        errors.append("未找到'上海'选项")
                except Exception as e:
                    errors.append(f"选择上海城市失败: {str(e)}")
                
                await asyncio.sleep(2)
                try:
                    await selectbox_click_area.click()
                    await asyncio.sleep(2)
                    
                    shenzhen_option = page.get_by_text("深圳", exact=True).last
                    if await shenzhen_option.count() > 0:
                        await shenzhen_option.click()
                        await asyncio.sleep(6)
                        await page.screenshot(path=os.path.join(IMG_DIR, "r4_3a_shenzhen_wordcloud.png"), full_page=True)
                        screenshots.append("r4_3a_shenzhen_wordcloud.png - 深圳词云图")
                    else:
                        errors.append("未找到'深圳'选项")
                except Exception as e:
                    errors.append(f"选择深圳城市失败: {str(e)}")
            else:
                errors.append("未找到城市选择组件")
            
            stats_tab = page.get_by_text("统计数据")
            if await stats_tab.count() > 0:
                await stats_tab.first.click()
                await asyncio.sleep(6)
                await page.screenshot(path=os.path.join(IMG_DIR, "r4_4_statistics.png"), full_page=True)
                screenshots.append("r4_4_statistics.png - 统计数据标签页")
            else:
                errors.append("未找到'统计数据'标签页")
            
            raw_data_tab = page.get_by_text("原始数据")
            if await raw_data_tab.count() > 0:
                await raw_data_tab.first.click()
                await asyncio.sleep(5)
                await page.screenshot(path=os.path.join(IMG_DIR, "r4_5_raw_data.png"), full_page=True)
                screenshots.append("r4_5_raw_data.png - 原始数据标签页")
                
                page_content = await page.content()
                friendly_headers = ["编号", "城市", "征婚启事原文", "包含户口要求", "户口关键词", 
                                    "包含房产要求", "房产关键词", "包含学历要求", "学历关键词",
                                    "OCR识别置信度", "OCR校正说明"]
                missing_headers = [h for h in friendly_headers if h not in page_content]
                if missing_headers:
                    errors.append(f"原始数据表缺少友好表头: {', '.join(missing_headers)}")
                
                if "has_education" in page_content or "education_keywords" in page_content:
                    errors.append("原始数据表仍包含数据库字段名")
            else:
                errors.append("未找到'原始数据'标签页")
            
            wordcloud_tab = page.get_by_text("词云图")
            if await wordcloud_tab.count() > 0:
                await wordcloud_tab.first.click()
                await asyncio.sleep(4)
                await page.screenshot(path=os.path.join(IMG_DIR, "r4_6_wordcloud_tab.png"), full_page=True)
                screenshots.append("r4_6_wordcloud_tab.png - 词云图标签页")
            else:
                errors.append("未找到'词云图'标签页")
            
            if page_errors:
                errors.append(f"页面错误: {'; '.join(page_errors[:3])}")
            
            warning_count = len([e for e in console_errors if e.startswith("[warning]")])
            error_count = len([e for e in console_errors if e.startswith("[error]")])
            if error_count > 0:
                errors.append(f"控制台错误({error_count}个): {'; '.join([e for e in console_errors if e.startswith('[error]')][:3])}")
            
        except Exception as e:
            errors.append(f"页面访问失败: {str(e)}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "r4_error_load.png"), full_page=True)
                screenshots.append("r4_error_load.png - 加载错误截图")
            except:
                pass
        
        await browser.close()
    
    return errors, screenshots, console_errors

if __name__ == "__main__":
    errors, screenshots, console_errors = asyncio.run(test_matchmaking_app())
    
    print("=" * 60)
    print("第4轮测试结果")
    print("=" * 60)
    print(f"\n截图文件 ({len(screenshots)} 张):")
    for s in screenshots:
        print(f"  ✓ {s}")
    
    if console_errors:
        print(f"\n控制台输出 ({len(console_errors)} 条):")
        for e in console_errors[:5]:
            print(f"  {'✗' if '[error]' in e else '⚠'} {e}")
        if len(console_errors) > 5:
            print(f"  ... 还有 {len(console_errors) - 5} 条")
    
    if errors:
        print(f"\n发现的问题 ({len(errors)} 个):")
        for e in errors:
            print(f"  ✗ {e}")
    else:
        print("\n✓ 未发现明显错误")
    
    print("\n" + "=" * 60)
