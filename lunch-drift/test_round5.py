import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/lunch-drift/img"
os.makedirs(IMG_DIR, exist_ok=True)

async def test_round5():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: console_logs.append(f"[PAGEERROR] {exc}"))
        
        print("=" * 60)
        print("测试1: 导航到页面并等待自动分析")
        print("=" * 60)
        await page.goto("http://localhost:5174", wait_until="networkidle")
        await asyncio.sleep(8)
        await page.screenshot(path=f"{IMG_DIR}/r5_01_first_load.png", full_page=True)
        print(f"✓ 首次加载截图: r5_01_first_load.png")
        
        print("\n" + "=" * 60)
        print("测试2: 检查控制台警告")
        print("=" * 60)
        warnings = [log for log in console_logs if "warning" in log.lower() or "warn" in log.lower()]
        errors = [log for log in console_logs if "error" in log.lower() or "ERROR" in log]
        print(f"控制台警告数: {len(warnings)}")
        print(f"控制台错误数: {len(errors)}")
        for w in warnings[:10]:
            print(f"  ⚠️  {w}")
        for e in errors[:10]:
            print(f"  ❌ {e}")
        
        with open(f"{IMG_DIR}/r5_console_logs.txt", "w") as f:
            f.write("\n".join(console_logs))
        print(f"✓ 控制台日志保存: r5_console_logs.txt")
        
        stats1 = await page.inner_text(".stats-panel")
        print(f"\n第一次分析统计:\n{stats1}")
        
        print("\n" + "=" * 60)
        print("测试3: 触发第二次分析，验证结果清除")
        print("=" * 60)
        
        await page.select_option(".form-select", index=1)
        await asyncio.sleep(3)
        await page.screenshot(path=f"{IMG_DIR}/r5_02_after_switch.png", full_page=True)
        print(f"✓ 切换写字楼截图: r5_02_after_switch.png")
        
        await page.click(".btn-primary")
        await asyncio.sleep(8)
        await page.screenshot(path=f"{IMG_DIR}/r5_03_second_analysis.png", full_page=True)
        print(f"✓ 第二次分析截图: r5_03_second_analysis.png")
        
        stats2 = await page.inner_text(".stats-panel")
        print(f"\n第二次分析统计:\n{stats2}")
        
        print("\n" + "=" * 60)
        print("测试4: 验证清除逻辑 - 检查加载状态")
        print("=" * 60)
        
        await page.click(".btn-primary")
        await asyncio.sleep(0.5)
        loading_text = await page.inner_text(".btn-primary")
        print(f"按钮状态: {loading_text}")
        
        await asyncio.sleep(7)
        await page.screenshot(path=f"{IMG_DIR}/r5_04_third_analysis.png", full_page=True)
        print(f"✓ 第三次分析截图: r5_04_third_analysis.png")
        
        print("\n" + "=" * 60)
        print("测试5: 点击商户点验证弹窗")
        print("=" * 60)
        map_container = await page.query_selector("#mapContainer")
        if map_container:
            box = await map_container.bounding_box()
            if box:
                for i, (x_ratio, y_ratio) in enumerate([(0.45, 0.4), (0.55, 0.5), (0.5, 0.6)]):
                    click_x = box['x'] + box['width'] * x_ratio
                    click_y = box['y'] + box['height'] * y_ratio
                    await page.mouse.click(click_x, click_y)
                    await asyncio.sleep(1)
                await page.screenshot(path=f"{IMG_DIR}/r5_05_marker_click.png", full_page=True)
                print(f"✓ 点击商户点截图: r5_05_marker_click.png")
        
        print("\n" + "=" * 60)
        print("测试6: 最终控制台状态检查")
        print("=" * 60)
        final_warnings = [log for log in console_logs if "warning" in log.lower() or "warn" in log.lower()]
        final_errors = [log for log in console_logs if "error" in log.lower() or "ERROR" in log]
        webgl_warnings = [log for log in console_logs if "WebGL" in log or "ReadPixels" in log]
        canvas_warnings = [log for log in console_logs if "willReadFrequently" in log or "Canvas2D" in log]
        
        print(f"总警告数: {len(final_warnings)}")
        print(f"总错误数: {len(final_errors)}")
        print(f"WebGL警告: {len(webgl_warnings)}")
        print(f"Canvas2D警告: {len(canvas_warnings)}")
        
        await browser.close()
        
        print("\n" + "=" * 60)
        print("测试完成！截图保存在:", IMG_DIR)
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_round5())
