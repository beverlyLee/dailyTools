import asyncio
from playwright.async_api import async_playwright
import os

async def test_detailed_visual():
    img_dir = "/Users/liboyang/trae/dailyTools/cyber-pet/img"
    issues = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        
        await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=30000)
        
        print("=" * 60)
        print("深度视觉测试 - 第2轮")
        print("=" * 60)
        
        print("\n测试1: 睡眠状态视觉验证")
        await page.mouse.move(5, 5)
        await asyncio.sleep(5)
        status = await page.locator(".status-indicator").text_content()
        excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
        print(f"  状态: {status}, 亲密度: {excitement}")
        await page.screenshot(path=f"{img_dir}/r2_07_sleep_visual.png", full_page=True)
        
        if "睡眠" in status:
            print("  ✓ 状态正确")
        else:
            issues.append(f"睡眠状态未触发: {status}")
        
        print("\n测试2: 清醒状态视觉验证（中等距离）")
        await page.mouse.move(900, 300)
        await asyncio.sleep(3)
        status = await page.locator(".status-indicator").text_content()
        excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
        print(f"  状态: {status}, 亲密度: {excitement}")
        await page.screenshot(path=f"{img_dir}/r2_08_awake_visual.png")
        
        if "注意" in status or "awake" in status.lower():
            print("  ✓ 清醒状态正确")
        else:
            issues.append(f"清醒状态未触发: {status}")
        
        print("\n测试3: 兴奋状态视觉验证（近距离）")
        await page.mouse.move(640, 400)
        await asyncio.sleep(3)
        status = await page.locator(".status-indicator").text_content()
        excitement = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
        print(f"  状态: {status}, 亲密度: {excitement}")
        await page.screenshot(path=f"{img_dir}/r2_09_excited_visual.png")
        
        if "兴奋" in status or "excited" in status.lower():
            print("  ✓ 兴奋状态正确")
        else:
            issues.append(f"兴奋状态未触发: {status}")
        
        print("\n测试4: 状态流转完整性检查")
        states_seen = set()
        positions = [(5, 5), (900, 300), (640, 400), (200, 600)]
        
        for pos in positions:
            await page.mouse.move(pos[0], pos[1])
            await asyncio.sleep(3)
            status = await page.locator(".status-indicator").text_content()
            states_seen.add(status)
            print(f"  位置{pos} → {status}")
        
        print(f"\n观察到的状态: {states_seen}")
        
        has_sleep = any("睡眠" in s for s in states_seen)
        has_awake = any("注意" in s for s in states_seen)
        has_excited = any("兴奋" in s for s in states_seen)
        
        if has_sleep and has_awake and has_excited:
            print("✓ 三种状态完整流转")
        else:
            missing = []
            if not has_sleep: missing.append("睡眠")
            if not has_awake: missing.append("清醒/注意")
            if not has_excited: missing.append("兴奋")
            issues.append(f"状态不完整，缺失: {', '.join(missing)}")
            print(f"✗ 状态缺失: {', '.join(missing)}")
        
        print("\n测试5: 检查是否有'害怕'状态")
        status_list = ['sleeping', 'awake', 'excited', 'scared', 'afraid', 'fear', '害怕']
        for s in status_list:
            has_state = await page.evaluate(f"document.body.textContent.includes('{s}')")
            if has_state:
                print(f"  发现状态关键词: {s}")
        
        found_scared = any("害怕" in s or "scared" in s.lower() or "afraid" in s.lower() for s in states_seen)
        if not found_scared:
            issues.append("缺失'害怕'状态 - 需求提到三种反应(开心、害怕、睡觉)，但代码只实现了睡眠、清醒、兴奋三种状态")
            print("✗ 缺失'害怕'状态")
        else:
            print("✓ 有害怕状态")
        
        print("\n测试6: 快速移动鼠标测试响应性")
        for i in range(3):
            await page.mouse.move(5, 5)
            await asyncio.sleep(1.5)
            s1 = await page.locator(".status-indicator").text_content()
            e1 = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            
            await page.mouse.move(640, 400)
            await asyncio.sleep(1.5)
            s2 = await page.locator(".status-indicator").text_content()
            e2 = await page.locator(".distance-bar-fill").evaluate("el => el.style.width")
            
            print(f"  循环{i+1}: 远离→{s1}({e1}) | 靠近→{s2}({e2})")
        
        await page.screenshot(path=f"{img_dir}/r2_10_final_visual.png")
        
        if console_errors:
            print(f"\n控制台错误: {console_errors}")
            for e in console_errors:
                issues.append(f"控制台错误: {e}")
        
        await browser.close()
    
    return issues

if __name__ == "__main__":
    issues = asyncio.run(test_detailed_visual())
    print("\n" + "=" * 60)
    print(f"深度测试发现 {len(issues)} 个问题:")
    for i, issue in enumerate(issues, 1):
        print(f"  {i}. {issue}")
