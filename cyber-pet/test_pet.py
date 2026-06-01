import asyncio
from playwright.async_api import async_playwright
import os

async def test_cyber_pet():
    img_dir = "/Users/liboyang/trae/dailyTools/cyber-pet/img"
    os.makedirs(img_dir, exist_ok=True)
    
    issues = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[PAGE ERROR] {exc.type}: {exc.message}"))
        
        try:
            await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=30000)
            print("✓ 页面加载成功")
            await page.screenshot(path=f"{img_dir}/01_initial_load.png", full_page=True)
            
            await asyncio.sleep(2)
            
            status_element = page.locator(".status-indicator")
            if await status_element.count() > 0:
                status_text = await status_element.text_content()
                print(f"✓ 状态指示器存在: {status_text}")
            else:
                issues.append("状态指示器元素不存在")
                print("✗ 状态指示器元素不存在")
            
            distance_bar = page.locator(".distance-bar")
            if await distance_bar.count() > 0:
                print("✓ 亲密度进度条存在")
            else:
                issues.append("亲密度进度条元素不存在")
                print("✗ 亲密度进度条元素不存在")
            
            print("\n--- 测试鼠标远离（睡眠状态）---")
            await page.mouse.move(10, 10)
            await asyncio.sleep(3)
            await page.screenshot(path=f"{img_dir}/02_mouse_far_sleeping.png")
            
            sleep_status = page.locator(".status-indicator", has_text="睡眠中")
            if await sleep_status.count() > 0:
                print("✓ 鼠标远离时显示'睡眠中'状态")
            else:
                status_text = await status_element.text_content() if await status_element.count() > 0 else "N/A"
                issues.append(f"鼠标远离时未正确显示睡眠状态，实际显示: {status_text}")
                print(f"✗ 鼠标远离时状态不正确: {status_text}")
            
            print("\n--- 测试鼠标靠近（清醒状态）---")
            await page.mouse.move(640, 400)
            await asyncio.sleep(3)
            await page.screenshot(path=f"{img_dir}/03_mouse_near_awake.png")
            
            awake_status = page.locator(".status-indicator", has_text="注意到你了")
            excited_status = page.locator(".status-indicator", has_text="好兴奋")
            if await awake_status.count() > 0 or await excited_status.count() > 0:
                print("✓ 鼠标靠近时显示清醒/兴奋状态")
            else:
                status_text = await status_element.text_content() if await status_element.count() > 0 else "N/A"
                issues.append(f"鼠标靠近时未正确显示清醒状态，实际显示: {status_text}")
                print(f"✗ 鼠标靠近时状态不正确: {status_text}")
            
            print("\n--- 测试鼠标非常靠近（兴奋状态）---")
            await page.mouse.move(640, 300)
            await asyncio.sleep(2)
            await page.screenshot(path=f"{img_dir}/04_mouse_very_close_excited.png")
            
            if await excited_status.count() > 0:
                print("✓ 鼠标非常靠近时显示'好兴奋'状态")
            else:
                status_text = await status_element.text_content() if await status_element.count() > 0 else "N/A"
                issues.append(f"鼠标非常靠近时未显示兴奋状态，实际显示: {status_text}")
                print(f"  当前状态: {status_text}")
            
            print("\n--- 测试 Canvas 渲染 ---")
            canvas = page.locator("canvas")
            if await canvas.count() > 0:
                print("✓ Canvas 元素存在")
                box = await canvas.bounding_box()
                if box and box["width"] > 0 and box["height"] > 0:
                    print("✓ Canvas 有正确的尺寸")
                else:
                    issues.append("Canvas 尺寸异常")
                    print("✗ Canvas 尺寸异常")
            else:
                issues.append("Canvas 元素不存在")
                print("✗ Canvas 元素不存在")
            
            if console_errors:
                print(f"\n✗ 发现 {len(console_errors)} 个控制台错误:")
                for err in console_errors[:5]:
                    print(f"  - {err}")
                    issues.append(f"控制台错误: {err}")
            else:
                print("\n✓ 无控制台错误")
            
            await page.screenshot(path=f"{img_dir}/05_final_state.png")
            
        except Exception as e:
            issues.append(f"测试过程中发生异常: {str(e)}")
            print(f"✗ 测试异常: {e}")
            await page.screenshot(path=f"{img_dir}/error_screenshot.png")
        
        await browser.close()
    
    return issues, console_errors

if __name__ == "__main__":
    issues, console_errors = asyncio.run(test_cyber_pet())
    
    print("\n" + "="*60)
    print("测试结果汇总:")
    print("="*60)
    if issues:
        print(f"发现 {len(issues)} 个问题:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
    else:
        print("所有测试通过!")
