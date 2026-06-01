import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"

async def comprehensive_test():
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
            
            await page.screenshot(path=os.path.join(IMG_DIR, "04_initial_rest.png"), full_page=True)
            
            print("[TEST 1] Moving mouse rapidly across screen...")
            for i in range(10):
                x = 100 + (i * 180) % 1800
                y = 200 + (i * 137) % 700
                await page.mouse.move(x, y)
                await asyncio.sleep(0.1)
            await asyncio.sleep(0.5)
            await page.screenshot(path=os.path.join(IMG_DIR, "05_rapid_move.png"), full_page=True)
            
            print("[TEST 2] Stopping mouse and waiting 5 seconds for restore...")
            await page.mouse.move(960, 540)
            for i in range(5):
                await asyncio.sleep(1)
                await page.screenshot(path=os.path.join(IMG_DIR, f"06_rest_{i+1}s.png"), full_page=True)
            
            print("[TEST 3] Checking for visual artifacts...")
            error_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const err = gl.getError();
                    const ext = gl.getExtension('WEBGL_debug_renderer_info');
                    let renderer = 'unknown';
                    if (ext) {
                        renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                    }
                    return { 
                        webglError: err, 
                        renderer: renderer,
                        width: canvas.width,
                        height: canvas.height
                    };
                }
            """)
            print(f"[INFO] WebGL status: {error_check}")
            
            print("[TEST 4] Checking canvas dimensions vs window...")
            dim_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    return {
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height,
                        windowWidth: window.innerWidth,
                        windowHeight: window.innerHeight,
                        dpr: window.devicePixelRatio
                    };
                }
            """)
            print(f"[INFO] Dimensions: {dim_check}")
            if dim_check['canvasWidth'] < 100 or dim_check['canvasHeight'] < 100:
                issues.append("Canvas dimensions too small, likely not rendering at full resolution")
            
            if console_errors:
                issues.append(f"Console errors: {console_errors}")
            
            if page_errors:
                issues.append(f"Page errors: {page_errors}")
                
        except Exception as e:
            issues.append(f"Test failed: {str(e)}")
        
        await browser.close()
    
    return issues

if __name__ == "__main__":
    issues = asyncio.run(comprehensive_test())
    if issues:
        print(f"\n[ISSUES FOUND] {len(issues)} issue(s):")
        for i, issue in enumerate(issues):
            print(f"  {i+1}. {issue}")
    else:
        print("\n[PASS] No issues found")
