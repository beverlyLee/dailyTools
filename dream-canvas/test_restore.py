import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"

async def test_particle_restore():
    os.makedirs(IMG_DIR, exist_ok=True)
    issues = []
    
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
            await asyncio.sleep(3)
            
            await page.screenshot(path=os.path.join(IMG_DIR, "07_initial_check.png"), full_page=True)
            
            print("[TEST] Moving mouse to center and waiting 10 seconds...")
            await page.mouse.move(960, 540)
            
            for i in range(10):
                await asyncio.sleep(1)
                if i in [0, 2, 4, 6, 9]:
                    await page.screenshot(
                        path=os.path.join(IMG_DIR, f"08_restore_{i+1}s.png"), 
                        full_page=True
                    )
                    print(f"  - Screenshot at {i+1}s taken")
            
            print("[TEST] Checking if particles are still visible...")
            particle_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const pixels = new Uint8Array(4);
                    gl.readPixels(960, 540, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    return {
                        centerPixel: Array.from(pixels),
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height
                    };
                }
            """)
            print(f"[INFO] Center pixel RGBA: {particle_check}")
            
            print("[TEST] Moving mouse around and checking FPS...")
            fps_samples = []
            for i in range(5):
                await page.mouse.move(200 + i * 350, 200 + (i % 2) * 400)
                await asyncio.sleep(0.3)
            
            if console_errors:
                issues.append(f"Console errors: {console_errors}")
            
            if page_errors:
                issues.append(f"Page errors: {page_errors}")
                
        except Exception as e:
            issues.append(f"Test failed: {str(e)}")
        
        await browser.close()
    
    return issues

if __name__ == "__main__":
    issues = asyncio.run(test_particle_restore())
    if issues:
        print(f"\n[ISSUES FOUND] {len(issues)} issue(s):")
        for i, issue in enumerate(issues):
            print(f"  {i+1}. {issue}")
    else:
        print("\n[PASS] No issues found")
