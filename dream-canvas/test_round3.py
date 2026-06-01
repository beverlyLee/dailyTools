import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"
URL = "http://localhost:5177/"

async def test_round3():
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
            
            print("[TEST 1] Initial rest state - particles should be visible and uniformly distributed")
            await page.screenshot(path=os.path.join(IMG_DIR, "r3_01_initial_rest.png"), full_page=True)
            
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
                    let totalBrightness = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            totalBrightness += (r + g + b);
                            if (b > 80 && b > r) blueCount++;
                            if (r > 80 && r > b) redCount++;
                        }
                    }
                    return {
                        nonBlack, blueCount, redCount,
                        coveragePct: (nonBlack / (w * h) * 100).toFixed(2) + '%',
                        avgBrightness: nonBlack > 0 ? (totalBrightness / nonBlack).toFixed(1) : 0,
                        totalPixels: w * h
                    };
                }
            """)
            print(f"[INFO] Initial rest: {initial_info}")
            
            print("[TEST 2] Mouse movement - fluid follow with color gradient")
            for i, (x, y) in enumerate([(300, 400), (600, 300), (900, 600), (1200, 250), (1500, 500), (1000, 800)]):
                await page.mouse.move(x, y)
                await asyncio.sleep(0.6)
            await page.screenshot(path=os.path.join(IMG_DIR, "r3_02_mouse_move.png"), full_page=True)
            
            move_info = await page.evaluate("""
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
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            if (b > 80 && b > r) blueCount++;
                            if (r > 80 && r > b) redCount++;
                        }
                    }
                    return { nonBlack, blueCount, redCount };
                }
            """)
            print(f"[INFO] After move: {move_info}")
            
            print("[TEST 3] Stop mouse, check restore behavior over 12 seconds")
            await page.mouse.move(960, 540)
            
            for sec in [3, 6, 9, 12]:
                await asyncio.sleep(3)
                path = os.path.join(IMG_DIR, f"r3_03_restore_{sec}s.png")
                await page.screenshot(path=path, full_page=True)
                print(f"  - Screenshot at {sec}s taken")
            
            print("[TEST 4] Final state after 15s rest")
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(IMG_DIR, "r3_04_final_rest.png"), full_page=True)
            
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
                    let redCount = 0;
                    let totalBrightness = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            totalBrightness += (r + g + b);
                            if (b > 80 && b > r) blueCount++;
                            if (r > 80 && r > b) redCount++;
                        }
                    }
                    return {
                        nonBlack, blueCount, redCount,
                        coveragePct: (nonBlack / (w * h) * 100).toFixed(2) + '%',
                        avgBrightness: nonBlack > 0 ? (totalBrightness / nonBlack).toFixed(1) : 0
                    };
                }
            """)
            print(f"[INFO] Final rest: {final_info}")
            
            print("[TEST 5] Checking WebGL status")
            webgl_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    return {
                        webglError: gl.getError(),
                        width: canvas.width,
                        height: canvas.height,
                        dpr: window.devicePixelRatio
                    };
                }
            """)
            print(f"[INFO] WebGL: {webgl_info}")
            
            print("[TEST 6] Color gradient test - move fast then slow")
            await page.mouse.move(200, 200)
            await asyncio.sleep(0.3)
            for i in range(10):
                await page.mouse.move(200 + i * 160, 300 + (i % 2) * 300)
                await asyncio.sleep(0.08)
            await page.screenshot(path=os.path.join(IMG_DIR, "r3_05_fast_move.png"), full_page=True)
            print("  - Fast move screenshot taken")
            
            await page.mouse.move(960, 540)
            await asyncio.sleep(8)
            await page.screenshot(path=os.path.join(IMG_DIR, "r3_06_color_restore.png"), full_page=True)
            print("  - Color restore screenshot taken")
            
            if console_errors:
                all_issues.append(f"Console errors: {console_errors}")
            if page_errors:
                all_issues.append(f"Page errors: {page_errors}")
            
            if initial_info.get('nonBlack', 0) < 500:
                all_issues.append(f"INITIAL VISIBILITY FAILURE: At rest, only {initial_info.get('nonBlack', 0)} non-black pixels ({initial_info.get('coveragePct', 'N/A')}), particles are barely visible. Expected: full screen covered with visible blue particles.")
            
            if move_info.get('redCount', 0) == 0 and move_info.get('nonBlack', 0) > 0:
                all_issues.append("COLOR GRADIENT FAILURE: After mouse movement, no red pixels detected. Expected: fast-moving particles should appear red.")
            
            if final_info.get('nonBlack', 0) < initial_info.get('nonBlack', 0) * 0.3:
                all_issues.append(f"RESTORE FAILURE: After 15s rest, only {final_info.get('nonBlack', 0)} non-black pixels vs {initial_info.get('nonBlack', 0)} initial. Particles not recovering properly.")
                
        except Exception as e:
            all_issues.append(f"Test exception: {str(e)}")
            print(f"[ERROR] {e}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "r3_00_error.png"), full_page=True)
            except:
                pass
        
        await browser.close()
    
    return all_issues

if __name__ == "__main__":
    issues = asyncio.run(test_round3())
    if issues:
        print(f"\n{'='*60}")
        print(f"[ISSUES FOUND] {len(issues)} issue(s):")
        for i, e in enumerate(issues):
            print(f"  {i+1}. {e}")
    else:
        print("\n[PASS] No issues found")
