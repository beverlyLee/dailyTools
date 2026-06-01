import asyncio
from playwright.async_api import async_playwright
import os
import time

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"

async def test_dream_canvas():
    os.makedirs(IMG_DIR, exist_ok=True)
    errors = []
    
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
            print("[INFO] Loading page http://localhost:5174/...")
            await page.goto("http://localhost:5174/", wait_until="networkidle", timeout=15000)
            print("[INFO] Page loaded successfully")
            
            await asyncio.sleep(2)
            
            print("[INFO] Taking initial screenshot...")
            await page.screenshot(path=os.path.join(IMG_DIR, "01_initial.png"), full_page=True)
            
            canvas = page.locator("canvas")
            if not await canvas.is_visible():
                errors.append("Canvas element not visible on page")
                print("[ERROR] Canvas not visible")
            
            print("[INFO] Simulating mouse movement...")
            for i, (x, y) in enumerate([(300, 300), (600, 400), (900, 500), (1200, 300), (1500, 600), (800, 800)]):
                await page.mouse.move(x, y)
                await asyncio.sleep(0.5)
                if i == 2:
                    await page.screenshot(path=os.path.join(IMG_DIR, "02_mouse_move.png"), full_page=True)
            
            print("[INFO] Moving mouse back to center...")
            await page.mouse.move(960, 540)
            await asyncio.sleep(1)
            
            print("[INFO] Waiting for particles to restore...")
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(IMG_DIR, "03_after_rest.png"), full_page=True)
            
            print("[INFO] Checking page content...")
            title = await page.title()
            print(f"[INFO] Page title: {title}")
            
            has_canvas = await page.evaluate("document.querySelector('canvas') !== null")
            print(f"[INFO] Canvas found on page: {has_canvas}")
            
            webgl_error = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return 'no canvas';
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return 'no webgl context';
                    return 'webgl ok';
                }
            """)
            print(f"[INFO] WebGL check: {webgl_error}")
            
            if console_errors:
                errors.append(f"Console errors: {console_errors}")
                print(f"[ERROR] Console errors: {console_errors}")
            
            if page_errors:
                errors.append(f"Page errors: {page_errors}")
                print(f"[ERROR] Page errors: {page_errors}")
                
        except Exception as e:
            errors.append(f"Page load error: {str(e)}")
            print(f"[ERROR] Page load error: {e}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "00_error.png"), full_page=True)
            except:
                pass
        
        await browser.close()
    
    return errors

if __name__ == "__main__":
    errors = asyncio.run(test_dream_canvas())
    if errors:
        print(f"\n[TEST RESULT] {len(errors)} error(s) found:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("\n[TEST RESULT] No errors found")
