import asyncio
from playwright.async_api import async_playwright
import os

async def test_round2():
    img_dir = "/Users/liboyang/trae/dailyTools/cyber-pet/img"
    os.makedirs(img_dir, exist_ok=True)
    
    issues = []
    console_errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[PAGE ERROR] {exc.type}: {exc.message}"))
        
        try:
            print("=" * 60)
            print("cyber-pet 第2轮测试")
            print("=" * 60)
            
            print("\n测试1: 初始加载状态（鼠标不动）")
            await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=30000)
            
            await asyncio.sleep(1)
            status1 = await page.locator(".status-indicator").text_content()
            excitement1 = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  加载1秒: 状态={status1}, 亲密度={excitement1}")
            await page.screenshot(path=f"{img_dir}/r2_01_initial_1s.png")
            
            await asyncio.sleep(1)
            status2 = await page.locator(".status-indicator").text_content()
            excitement2 = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  加载2秒: 状态={status2}, 亲密度={excitement2}")
            
            await asyncio.sleep(2)
            status4 = await page.locator(".status-indicator").text_content()
            excitement4 = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  加载4秒: 状态={status4}, 亲密度={excitement4}")
            await page.screenshot(path=f"{img_dir}/r2_02_initial_4s.png")
            
            if "睡眠" in status4 or "sleep" in status4.lower():
                print("✓ 初始状态正确：宠物在睡觉")
            else:
                issues.append(f"初始状态不是睡眠，实际显示: {status4}")
                print(f"✗ 初始状态错误: {status4}")
            
            print("\n测试2: 鼠标靠近（屏幕中心）")
            await page.mouse.move(640, 400)
            for i in range(5):
                await asyncio.sleep(1)
                status = await page.locator(".status-indicator").text_content()
                excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
                print(f"  第{i+1}秒: 状态={status}, 亲密度={excitement}")
            
            await page.screenshot(path=f"{img_dir}/r2_03_mouse_center.png")
            center_status = await page.locator(".status-indicator").text_content()
            if "兴奋" in center_status or "awake" in center_status.lower() or "注意" in center_status:
                print("✓ 鼠标靠近时宠物清醒/兴奋")
            else:
                issues.append(f"鼠标靠近时状态不正确: {center_status}")
                print(f"✗ 鼠标靠近时状态错误: {center_status}")
            
            print("\n测试3: 鼠标移到角落（远离）")
            await page.mouse.move(5, 5)
            for i in range(8):
                await asyncio.sleep(1)
                status = await page.locator(".status-indicator").text_content()
                excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
                print(f"  第{i+1}秒: 状态={status}, 亲密度={excitement}")
            
            await page.screenshot(path=f"{img_dir}/r2_04_mouse_corner.png")
            corner_status = await page.locator(".status-indicator").text_content()
            corner_excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            
            if "睡眠" in corner_status or "sleep" in corner_status.lower():
                print("✓ 鼠标远离时宠物进入睡眠")
            else:
                issues.append(f"鼠标远离8秒后仍未睡眠，状态={corner_status}, 亲密度={corner_excitement}")
                print(f"✗ 鼠标远离时未进入睡眠: {corner_status}")
            
            print("\n测试4: 再次靠近验证唤醒")
            await page.mouse.move(640, 400)
            await asyncio.sleep(3)
            wake_status = await page.locator(".status-indicator").text_content()
            print(f"  3秒后状态: {wake_status}")
            await page.screenshot(path=f"{img_dir}/r2_05_wake_up.png")
            
            if "睡眠" not in wake_status:
                print("✓ 宠物被成功唤醒")
            else:
                issues.append(f"鼠标靠近3秒后仍在睡眠: {wake_status}")
                print(f"✗ 宠物未被唤醒: {wake_status}")
            
            print("\n测试5: Canvas 渲染和 UI 元素")
            canvas = page.locator("canvas")
            if await canvas.count() > 0:
                box = await canvas.bounding_box()
                if box and box["width"] > 0 and box["height"] > 0:
                    print("✓ Canvas 渲染正常")
                else:
                    issues.append("Canvas 尺寸异常")
                    print("✗ Canvas 尺寸异常")
            else:
                issues.append("Canvas 元素不存在")
                print("✗ Canvas 不存在")
            
            ui_elements = [".status-indicator", ".distance-bar", ".hint"]
            for sel in ui_elements:
                if await page.locator(sel).count() > 0:
                    print(f"✓ UI元素存在: {sel}")
                else:
                    issues.append(f"UI元素缺失: {sel}")
                    print(f"✗ UI元素缺失: {sel}")
            
            if console_errors:
                print(f"\n✗ 控制台错误 ({len(console_errors)}):")
                for err in console_errors[:5]:
                    print(f"  - {err}")
                    issues.append(f"控制台错误: {err}")
            else:
                print("\n✓ 无控制台错误")
            
            await page.screenshot(path=f"{img_dir}/r2_06_final.png")
            
        except Exception as e:
            issues.append(f"测试异常: {str(e)}")
            print(f"✗ 测试异常: {e}")
            try:
                await page.screenshot(path=f"{img_dir}/r2_error.png")
            except:
                pass
        
        await browser.close()
    
    return issues, console_errors

if __name__ == "__main__":
    issues, errors = asyncio.run(test_round2())
    print("\n" + "=" * 60)
    print(f"测试完成，发现 {len(issues)} 个问题:")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
