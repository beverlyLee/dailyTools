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
        page = await browser.new_page()
        
        try:
            await page.goto("http://localhost:8502", timeout=60000)
            await page.wait_for_load_state("networkidle", timeout=30000)
            
            await asyncio.sleep(5)
            
            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            
            page_error = None
            page.on("pageerror", lambda exc: errors.append(f"页面错误: {str(exc)}"))
            
            await page.screenshot(path=os.path.join(IMG_DIR, "1_homepage.png"), full_page=True)
            screenshots.append("1_homepage.png - 首页加载")
            
            page_title = await page.title()
            if "城市公园相亲角" not in page_title:
                errors.append(f"页面标题不正确: {page_title}")
            
            has_wordcloud = await page.get_by_text("词云图").count() > 0
            if not has_wordcloud:
                errors.append("未找到'词云图'标签页")
            
            city_selector = page.locator('select')
            if await city_selector.count() > 0:
                await asyncio.sleep(2)
                
                try:
                    await city_selector.select_option("北京")
                    await asyncio.sleep(4)
                    await page.screenshot(path=os.path.join(IMG_DIR, "2_beijing_wordcloud.png"), full_page=True)
                    screenshots.append("2_beijing_wordcloud.png - 北京词云图")
                except Exception as e:
                    errors.append(f"选择北京城市失败: {str(e)}")
                
                try:
                    await city_selector.select_option("上海")
                    await asyncio.sleep(4)
                    await page.screenshot(path=os.path.join(IMG_DIR, "3_shanghai_wordcloud.png"), full_page=True)
                    screenshots.append("3_shanghai_wordcloud.png - 上海词云图")
                except Exception as e:
                    errors.append(f"选择上海城市失败: {str(e)}")
            
            try:
                await page.get_by_text("统计数据").click()
                await asyncio.sleep(3)
                await page.screenshot(path=os.path.join(IMG_DIR, "4_statistics.png"), full_page=True)
                screenshots.append("4_statistics.png - 统计数据标签页")
            except Exception as e:
                errors.append(f"点击统计数据标签失败: {str(e)}")
            
            try:
                await page.get_by_text("原始数据").click()
                await asyncio.sleep(3)
                await page.screenshot(path=os.path.join(IMG_DIR, "5_raw_data.png"), full_page=True)
                screenshots.append("5_raw_data.png - 原始数据标签页")
            except Exception as e:
                errors.append(f"点击原始数据标签失败: {str(e)}")
            
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
