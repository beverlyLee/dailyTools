import asyncio
from playwright.async_api import async_playwright
import os

async def test_detailed():
    img_dir = "/Users/liboyang/trae/dailyTools/cyber-pet/img"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=30000)
        
        print("测试1: 鼠标移动到角落并等待5秒...")
        await page.mouse.move(5, 5)
        for i in range(6):
            await asyncio.sleep(1)
            status_text = await page.locator(".status-indicator").text_content()
            excitement_bar = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  第{i+1}秒: 状态={status_text}, 亲密度={excitement_bar}")
        
        await page.screenshot(path=f"{img_dir}/06_corner_wait_5s.png")
        
        print("\n测试2: 鼠标快速移动验证响应...")
        await page.mouse.move(640, 400)
        await asyncio.sleep(2)
        status = await page.locator(".status-indicator").text_content()
        print(f"  鼠标靠近后: {status}")
        
        await page.mouse.move(5, 5)
        await asyncio.sleep(5)
        status = await page.locator(".status-indicator").text_content()
        bar_width = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
        print(f"  再次移到角落等5秒后: {status}, 进度条: {bar_width}")
        
        await page.screenshot(path=f"{img_dir}/07_corner_wait_10s_total.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_detailed())
