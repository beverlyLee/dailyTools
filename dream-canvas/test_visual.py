import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"

async def test_visual():
    os.makedirs(IMG_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        console_errors = []
        page_errors = []
        
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(f"[{msg.type}] {msg.text}")
        
        def handle_pageerror(err):
            page_errors.append(str(err))
        
        page.on("console", handle_console)
        page.on("pageerror", handle_pageerror)
        
        try:
            await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=15000)
            await asyncio.sleep(4)
            
            print("[TEST] Initial state - particles at rest")
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_05_initial_4s.png"), full_page=True)
            
            print("[TEST] Mouse rapid movement test")
            for i in range(20):
                x = 100 + (i * 85) % 1800
                y = 200 + (i * 67) % 700
                await page.mouse.move(x, y)
                await asyncio.sleep(0.15)
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_06_rapid_move.png"), full_page=True)
            
            print("[TEST] Stop mouse, wait 20s for restore with periodic screenshots")
            await page.mouse.move(960, 540)
            
            for sec in [5, 10, 15, 20]:
                await asyncio.sleep(5)
                path = os.path.join(IMG_DIR, f"r2_07_restore_{sec}s.png")
                await page.screenshot(path=path, full_page=True)
            
            print("[TEST] Final check")
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_08_final.png"), full_page=True)
            
            if console_errors:
                print(f"[ERROR] Console: {console_errors}")
            if page_errors:
                print(f"[ERROR] Page: {page_errors}")
                
        except Exception as e:
            print(f"[ERROR] {e}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_visual())
    print("\n[DONE] Test complete")
