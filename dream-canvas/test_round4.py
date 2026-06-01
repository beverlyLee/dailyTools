import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"
URL = "http://localhost:5175/"

async def test_round4():
    os.makedirs(IMG_DIR, exist_ok=True)
    all_issues = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
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
            print("[INFO] Loading page...")
            await page.goto(URL, wait_until="networkidle", timeout=15000)
            await asyncio.sleep(4)
            
            print("[TEST 1] Initial rest state")
            await page.screenshot(path=os.path.join(IMG_DIR, "r4_01_initial_rest.png"), full_page=True)
            
            initial_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let blueCount = 0;
                    let redCount = 0;
                    let whiteCount = 0;
                    let totalBrightness = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            totalBrightness += (r + g + b);
                            if (b > 80 && b > r * 1.2) blueCount++;
                            if (r > 100 && r > b * 1.2) redCount++;
                            if (r > 180 && g > 180 && b > 180) whiteCount++;
                        }
                    }
                    return {
                        nonBlack, blueCount, redCount, whiteCount,
                        coveragePct: (nonBlack / (w * h) * 100).toFixed(2) + '%',
                        avgBrightness: nonBlack > 0 ? (totalBrightness / nonBlack).toFixed(1) : 0
                    };
                }
            """)
            print(f"[INFO] Initial rest: {initial_info}")
            
            print("[TEST 2] Slow mouse movement - should stay mostly blue")
            for i in range(5):
                await page.mouse.move(400 + i * 30, 400 + i * 20)
                await asyncio.sleep(0.8)
            await page.screenshot(path=os.path.join(IMG_DIR, "r4_02_slow_move.png"), full_page=True)
            
            slow_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let blueCount = 0;
                    let redCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.2) blueCount++;
                        if (r > 100 && r > b * 1.2) redCount++;
                    }
                    return { nonBlack, blueCount, redCount };
                }
            """)
            print(f"[INFO] After slow move: {slow_info}")
            
            print("[TEST 3] Fast mouse movement - should turn red")
            for i in range(30):
                await page.mouse.move(200 + (i * 57) % 1600, 200 + (i * 43) % 700)
                await asyncio.sleep(0.05)
            await page.screenshot(path=os.path.join(IMG_DIR, "r4_03_fast_move.png"), full_page=True)
            
            fast_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let blueCount = 0;
                    let redCount = 0;
                    let whiteCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.2) blueCount++;
                        if (r > 100 && r > b * 1.2) redCount++;
                        if (r > 180 && g > 180 && b > 180) whiteCount++;
                    }
                    return { nonBlack, blueCount, redCount, whiteCount };
                }
            """)
            print(f"[INFO] After fast move: {fast_info}")
            
            print("[TEST 4] Stop mouse, check restore over 12s")
            await page.mouse.move(960, 540)
            for sec in [3, 6, 9, 12]:
                await asyncio.sleep(3)
                await page.screenshot(path=os.path.join(IMG_DIR, f"r4_04_restore_{sec}s.png"), full_page=True)
                print(f"  - Screenshot at {sec}s taken")
            
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(IMG_DIR, "r4_05_final_rest.png"), full_page=True)
            
            final_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let blueCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.2) blueCount++;
                    }
                    return {
                        nonBlack, blueCount,
                        coveragePct: (nonBlack / (w * h) * 100).toFixed(2) + '%'
                    };
                }
            """)
            print(f"[INFO] Final rest: {final_info}")
            
            print("[TEST 5] WebGL status")
            webgl_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    return { webglError: gl.getError(), width: canvas.width, height: canvas.height };
                }
            """)
            print(f"[INFO] WebGL: {webgl_info}")
            
            if console_errors:
                all_issues.append(f"Console errors: {console_errors}")
            if page_errors:
                all_issues.append(f"Page errors: {page_errors}")
            
            if fast_info.get('redCount', 0) == 0 and fast_info.get('nonBlack', 0) > 0:
                all_issues.append(f"COLOR GRADIENT FAILURE: After fast mouse movement, redCount={fast_info.get('redCount', 0)} vs whiteCount={fast_info.get('whiteCount', 0)}. No red pixels detected. Expected: fast-moving particles should appear predominantly red.")
            
            if slow_info.get('blueCount', 0) == 0 and slow_info.get('nonBlack', 0) > 0:
                all_issues.append(f"BLUE REST FAILURE: After slow movement, blueCount=0. Expected: slow particles should remain blue.")
                
        except Exception as e:
            all_issues.append(f"Test exception: {str(e)}")
            print(f"[ERROR] {e}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "r4_00_error.png"), full_page=True)
            except:
                pass
        
        await browser.close()
    
    return all_issues

if __name__ == "__main__":
    issues = asyncio.run(test_round4())
    if issues:
        print(f"\n{'='*60}")
        print(f"[ISSUES FOUND] {len(issues)} issue(s):")
        for i, e in enumerate(issues):
            print(f"  {i+1}. {e}")
    else:
        print("\n[PASS] No issues found")
