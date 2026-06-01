import asyncio
from playwright.async_api import async_playwright
import os

async def test_round3():
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
        print("cyber-pet 第3轮测试")
        print("=" * 60)
        
        try:
            await page.goto("http://localhost:5173/", wait_until="networkidle", timeout=30000)
            
            print("\n测试1: 初始状态")
            await page.mouse.move(5, 5)
            await asyncio.sleep(5)
            status = await page.locator(".status-indicator").text_content()
            excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  状态: {status}, 亲密度: {excitement}")
            await page.screenshot(path=f"{img_dir}/r3_01_initial_sleep.png")
            
            if "睡眠" in status:
                print("  ✓ 初始睡眠状态正确")
            else:
                issues.append(f"初始状态不是睡眠: {status}")
                print(f"  ✗ 初始状态错误")
            
            print("\n测试2: 缓慢靠近（应该触发兴奋而非害怕）")
            for i in range(10):
                x = 5 + i * 63
                y = 5 + i * 39
                await page.mouse.move(x, y)
                await asyncio.sleep(0.3)
            
            await asyncio.sleep(2)
            status = await page.locator(".status-indicator").text_content()
            excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  状态: {status}, 亲密度: {excitement}")
            await page.screenshot(path=f"{img_dir}/r3_02_slow_approach.png")
            
            if "害怕" in status or "吓到" in status:
                issues.append(f"缓慢靠近时错误触发了害怕状态: {status}")
                print("  ✗ 缓慢靠近不应触发害怕")
            elif "兴奋" in status or "注意" in status:
                print("  ✓ 缓慢靠近触发正常状态")
            else:
                print(f"  ⚠ 状态: {status}")
            
            print("\n测试3: 快速移动（测试害怕触发）")
            scared_count = 0
            for i in range(5):
                await page.mouse.move(5, 5)
                await asyncio.sleep(1)
                
                start_x, start_y = 5, 5
                end_x, end_y = 640, 400
                steps = 5
                for j in range(steps):
                    t = (j + 1) / steps
                    x = int(start_x + (end_x - start_x) * t)
                    y = int(start_y + (end_y - start_y) * t)
                    await page.mouse.move(x, y)
                    await asyncio.sleep(0.05)
                
                await asyncio.sleep(0.5)
                status = await page.locator(".status-indicator").text_content()
                print(f"  快速移动{i+1}后: {status}")
                if "害怕" in status or "吓到" in status:
                    scared_count += 1
            
            await page.screenshot(path=f"{img_dir}/r3_03_scared_test.png")
            
            if scared_count >= 1:
                print(f"  ✓ 成功触发害怕状态 {scared_count} 次")
            else:
                issues.append("快速移动未触发害怕状态，害怕状态触发条件可能太严格")
                print("  ✗ 害怕状态未触发")
            
            print("\n测试4: 四种状态区间分布测试（线性缓慢移动）")
            states = {}
            positions = [
                ("角落(远)", 5, 5),
                ("侧边(中)", 900, 400),
                ("中心(近)", 640, 400),
            ]
            
            for name, x, y in positions:
                await page.mouse.move(x, y)
                await asyncio.sleep(3)
                status = await page.locator(".status-indicator").text_content()
                excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
                states[name] = (status, excitement)
                print(f"  {name}: {status}, 亲密度={excitement}")
            
            await page.screenshot(path=f"{img_dir}/r3_04_state_distribution.png")
            
            has_sleep = any("睡眠" in s[0] for s in states.values())
            has_awake = any("注意" in s[0] for s in states.values())
            has_excited = any("兴奋" in s[0] for s in states.values())
            
            print(f"\n  睡眠: {'✓' if has_sleep else '✗'} | 注意: {'✓' if has_awake else '✗'} | 兴奋: {'✓' if has_excited else '✗'}")
            
            if not has_sleep:
                issues.append("睡眠状态在测试中未被观察到")
            if not has_awake:
                issues.append("注意/清醒状态在测试中未被观察到，区间可能过窄")
            if not has_excited:
                issues.append("兴奋状态在测试中未被观察到")
            
            print("\n测试5: 状态保持与恢复")
            await page.mouse.move(640, 400)
            await asyncio.sleep(2)
            print(f"  中心位置: {await page.locator('.status-indicator').text_content()}")
            
            await page.mouse.move(1275, 795)
            await asyncio.sleep(4)
            final_status = await page.locator(".status-indicator").text_content()
            final_excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            print(f"  移到角落4秒后: {final_status}, 亲密度={final_excitement}")
            
            if "睡眠" in final_status:
                print("  ✓ 能从兴奋状态恢复到睡眠")
            else:
                issues.append(f"从兴奋状态无法回到睡眠，最终状态={final_status}")
                print("  ✗ 状态恢复有问题")
            
            await page.screenshot(path=f"{img_dir}/r3_05_state_recovery.png")
            
            print("\n测试6: 检查控制台错误")
            if console_errors:
                print(f"  ✗ 发现 {len(console_errors)} 个错误:")
                for err in console_errors[:3]:
                    print(f"    - {err}")
                    issues.append(f"控制台错误: {err}")
            else:
                print("  ✓ 无控制台错误")
            
            await page.screenshot(path=f"{img_dir}/r3_06_final.png")
            
        except Exception as e:
            issues.append(f"测试异常: {str(e)}")
            print(f"✗ 测试异常: {e}")
            try:
                await page.screenshot(path=f"{img_dir}/r3_error.png")
            except:
                pass
        
        await browser.close()
    
    return issues, console_errors

if __name__ == "__main__":
    issues, errors = asyncio.run(test_round3())
    print("\n" + "=" * 60)
    print(f"测试完成，发现 {len(issues)} 个问题:")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
