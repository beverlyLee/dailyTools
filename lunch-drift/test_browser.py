import asyncio
from playwright.async_api import async_playwright
import os
import json
import time

IMG_DIR = "/Users/liboyang/trae/dailyTools/lunch-drift/img"
os.makedirs(IMG_DIR, exist_ok=True)

async def test_lunch_drift():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[PAGEERROR] {exc}"))
        
        print("=" * 60)
        print("测试1: 导航到前端页面")
        print("=" * 60)
        await page.goto("http://localhost:5174", wait_until="networkidle")
        await page.screenshot(path=f"{IMG_DIR}/01_page_load.png", full_page=True)
        print(f"✓ 页面加载完成，截图保存: 01_page_load.png")
        
        print("\n" + "=" * 60)
        print("测试2: 等待首次自动分析完成")
        print("=" * 60)
        await asyncio.sleep(5)
        
        await page.screenshot(path=f"{IMG_DIR}/02_auto_analysis.png", full_page=True)
        print(f"✓ 等待5秒后截图，验证自动分析: 02_auto_analysis.png")
        
        stats_text = await page.inner_text(".stats-panel")
        print(f"\n统计面板内容:\n{stats_text}")
        
        legend_text = await page.inner_text(".legend")
        print(f"\n图例内容:\n{legend_text}")
        
        print("\n" + "=" * 60)
        print("测试3: 点击商户点验证弹窗")
        print("=" * 60)
        
        map_container = await page.query_selector("#mapContainer")
        if map_container:
            box = await map_container.bounding_box()
            if box:
                click_x = box['x'] + box['width'] * 0.5
                click_y = box['y'] + box['height'] * 0.4
                print(f"点击地图位置: ({click_x}, {click_y})")
                await page.mouse.click(click_x, click_y)
                await asyncio.sleep(2)
                await page.screenshot(path=f"{IMG_DIR}/03_marker_click.png", full_page=True)
                print(f"✓ 点击商户点后截图: 03_marker_click.png")
        
        print("\n" + "=" * 60)
        print("测试4: 切换写字楼")
        print("=" * 60)
        building_select = await page.query_selector(".form-select")
        if building_select:
            options = await building_select.query_selector_all("option")
            if len(options) >= 2:
                await building_select.select_option(index=1)
                await asyncio.sleep(3)
                await page.screenshot(path=f"{IMG_DIR}/04_building_change.png", full_page=True)
                print(f"✓ 切换写字楼后截图: 04_building_change.png")
        
        print("\n" + "=" * 60)
        print("测试5: 手动点击开始分析")
        print("=" * 60)
        analyze_btn = await page.query_selector(".btn-primary")
        if analyze_btn:
            await analyze_btn.click()
            await asyncio.sleep(5)
            await page.screenshot(path=f"{IMG_DIR}/05_manual_analysis.png", full_page=True)
            print(f"✓ 手动分析后截图: 05_manual_analysis.png")
        
        print("\n" + "=" * 60)
        print("测试6: 检查控制台错误")
        print("=" * 60)
        if console_errors:
            print(f"⚠️  发现 {len(console_errors)} 条控制台错误/警告:")
            for err in console_errors[:10]:
                print(f"  - {err}")
            with open(f"{IMG_DIR}/console_errors.txt", "w") as f:
                f.write("\n".join(console_errors))
            print(f"✓ 控制台错误已保存到: console_errors.txt")
        else:
            print("✓ 无控制台错误")
        
        print("\n" + "=" * 60)
        print("测试7: 检查三类商户路径颜色")
        print("=" * 60)
        
        html_content = await page.content()
        
        color_checks = {
            "堂食友好路径 (蓝色 #2196F3/#1E88E5)": ["#2196F3", "#1E88E5"],
            "仅外卖路径 (橙色 #FF9800)": ["#FF9800"],
            "超出范围路径 (红色 #f44336)": ["#f44336", "#F44336"],
        }
        
        for desc, colors in color_checks.items():
            found = any(color in html_content for color in colors)
            status = "✓" if found else "❌"
            print(f"  {status} {desc}: {'找到' if found else '未找到'}")
        
        await browser.close()
        
        print("\n" + "=" * 60)
        print("测试完成！所有截图保存在:", IMG_DIR)
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_lunch_drift())
