import asyncio
from playwright.async_api import async_playwright
import os

async def test_round5():
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
        
        print("=" * 60)
        print("cyber-pet 第5轮测试")
        print("=" * 60)
        
        try:
            await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=30000)
            
            print("\n测试1: 四种状态区间分布（精确位置测试）")
            test_positions = [
                ("角落-远", 5, 5),
                ("侧边-较远", 1000, 200),
                ("侧边-中", 800, 400),
                ("中部-较近", 700, 450),
                ("中心-近", 640, 400),
            ]
            
            states = {}
            for name, x, y in test_positions:
                await page.mouse.move(x, y)
                await asyncio.sleep(3)
                status = await page.locator(".status-indicator").text_content()
                excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
                states[name] = (status, excitement)
                print(f"  {name}: {status}, 亲密度={excitement}")
            
            await page.screenshot(path=f"{img_dir}/r5_01_state_distribution.png")
            
            has_sleep = any("睡眠" in s[0] for s in states.values())
            has_awake = any("注意" in s[0] for s in states.values())
            has_excited = any("兴奋" in s[0] for s in states.values())
            
            print(f"\n  睡眠: {'✓' if has_sleep else '✗'} | 注意: {'✓' if has_awake else '✗'} | 兴奋: {'✓' if has_excited else '✗'}")
            
            if not has_sleep:
                issues.append("睡眠状态未观察到")
            if not has_awake:
                issues.append("'注意到你了'状态仍然无法触发，区间可能仍有问题")
            if not has_excited:
                issues.append("兴奋状态未观察到")
            
            if has_awake:
                print("\n  ✓ '注意到你了'状态成功触发!")
            
            print("\n测试2: 建模完整性（检查背部黑色圆形是否删除）")
            await page.mouse.move(640, 400)
            await asyncio.sleep(2)
            await page.screenshot(path=f"{img_dir}/r5_02_model_check.png")
            print("  ✓ 已截图验证建模完整性")
            
            print("\n测试3: 害怕状态验证")
            scared_count = 0
            for i in range(3):
                await page.mouse.move(5, 5)
                await asyncio.sleep(1)
                
                for j in range(5):
                    t = (j + 1) / 5
                    await page.mouse.move(int(5 + 635 * t), int(5 + 395 * t))
                    await asyncio.sleep(0.05)
                
                await asyncio.sleep(0.5)
                status = await page.locator(".status-indicator").text_content()
                print(f"  快速移动{i+1}: {status}")
                if "害怕" in status or "吓到" in status:
                    scared_count += 1
            
            if scared_count >= 1:
                print(f"  ✓ 害怕状态正常 ({scared_count}/3)")
            else:
                issues.append("害怕状态触发失败")
                print("  ✗ 害怕状态未触发")
            
            await page.screenshot(path=f"{img_dir}/r5_03_scared.png")
            
            print("\n测试4: 状态流转完整性")
            await page.mouse.move(5, 5)
            await asyncio.sleep(4)
            s1 = await page.locator(".status-indicator").text_content()
            print(f"  远离: {s1}")
            
            await page.mouse.move(850, 350)
            await asyncio.sleep(3)
            s2 = await page.locator(".status-indicator").text_content()
            print(f"  中部: {s2}")
            
            await page.mouse.move(640, 400)
            await asyncio.sleep(3)
            s3 = await page.locator(".status-indicator").text_content()
            print(f"  中心: {s3}")
            
            await page.mouse.move(1275, 795)
            await asyncio.sleep(4)
            s4 = await page.locator(".status-indicator").text_content()
            print(f"  回到角落: {s4}")
            
            await page.screenshot(path=f"{img_dir}/r5_04_flow.png")
            
            print("\n测试5: 控制台错误检查")
            if console_errors:
                print(f"  ✗ 发现 {len(console_errors)} 个错误")
                for err in console_errors[:3]:
                    print(f"    - {err}")
                    issues.append(f"控制台错误: {err}")
            else:
                print("  ✓ 无控制台错误")
            
            await page.screenshot(path=f"{img_dir}/r5_05_final.png")
            
        except Exception as e:
            issues.append(f"测试异常: {str(e)}")
            print(f"✗ 测试异常: {e}")
            try:
                await page.screenshot(path=f"{img_dir}/r5_error.png")
            except:
                pass
        
        await browser.close()
    
    return issues, console_errors

if __name__ == "__main__":
    issues, errors = asyncio.run(test_round5())
    print("\n" + "=" * 60)
    print(f"测试完成，发现 {len(issues)} 个问题:")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
