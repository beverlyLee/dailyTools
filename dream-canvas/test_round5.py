import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"
URL = "http://localhost:5174/"

async def test_round5():
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
            
            print("[TEST 1] Initial rest state - should be uniform blue particles")
            await page.screenshot(path=os.path.join(IMG_DIR, "r5_01_initial_rest.png"), full_page=True)
            
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
                            if (b > 80 && b > r * 1.1) blueCount++;
                            if (r > 100 && r > b * 1.1) redCount++;
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
            
            print("[TEST 2] Slow mouse movement - should stay blue/cyan")
            for i in range(8):
                await page.mouse.move(300 + i * 180, 300 + (i % 2) * 200)
                await asyncio.sleep(0.5)
            await page.screenshot(path=os.path.join(IMG_DIR, "r5_02_slow_move.png"), full_page=True)
            
            slow_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0, blueCount = 0, redCount = 0, whiteCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.1) blueCount++;
                        if (r > 100 && r > b * 1.1) redCount++;
                        if (r > 180 && g > 180 && b > 180) whiteCount++;
                    }
                    return { nonBlack, blueCount, redCount, whiteCount };
                }
            """)
            print(f"[INFO] After slow move: {slow_info}")
            
            print("[TEST 3] Fast mouse movement - should turn RED (not white)")
            for i in range(40):
                await page.mouse.move(200 + (i * 43) % 1600, 200 + (i * 37) % 700)
                await asyncio.sleep(0.04)
            await page.screenshot(path=os.path.join(IMG_DIR, "r5_03_fast_move.png"), full_page=True)
            
            fast_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0, blueCount = 0, redCount = 0, whiteCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.1) blueCount++;
                        if (r > 100 && r > b * 1.1) redCount++;
                        if (r > 180 && g > 180 && b > 180) whiteCount++;
                    }
                    return { nonBlack, blueCount, redCount, whiteCount };
                }
            """)
            print(f"[INFO] After fast move: {fast_info}")
            
            print("[TEST 4] Stop mouse at center, check for white residual over 15s")
            await page.mouse.move(960, 540)
            for sec in [3, 6, 9, 12, 15]:
                await asyncio.sleep(3)
                await page.screenshot(path=os.path.join(IMG_DIR, f"r5_04_restore_{sec}s.png"), full_page=True)
                
                center_info = await page.evaluate("""
                    () => {
                        const canvas = document.querySelector('canvas');
                        if (!canvas) return { error: 'no canvas' };
                        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                        if (!gl) return { error: 'no webgl' };
                        const w = canvas.width, h = canvas.height;
                        const cx = Math.floor(w/2), cy = Math.floor(h/2);
                        const blockSize = 40;
                        const pixels = new Uint8Array(blockSize * blockSize * 4);
                        gl.readPixels(cx - blockSize/2, cy - blockSize/2, blockSize, blockSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                        let nonBlack = 0, blueCount = 0, redCount = 0, whiteCount = 0;
                        let rSum = 0, gSum = 0, bSum = 0;
                        for (let i = 0; i < blockSize * blockSize; i++) {
                            const idx = i * 4;
                            const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                            if (r > 0 || g > 0 || b > 0) {
                                nonBlack++;
                                rSum += r; gSum += g; bSum += b;
                                if (b > 80 && b > r * 1.1) blueCount++;
                                if (r > 100 && r > b * 1.1) redCount++;
                                if (r > 180 && g > 180 && b > 180) whiteCount++;
                            }
                        }
                        return {
                            nonBlack, blueCount, redCount, whiteCount,
                            avgR: nonBlack > 0 ? Math.round(rSum / nonBlack) : 0,
                            avgG: nonBlack > 0 ? Math.round(gSum / nonBlack) : 0,
                            avgB: nonBlack > 0 ? Math.round(bSum / nonBlack) : 0
                        };
                    }
                """)
                print(f"  - {sec}s: center pixels white={center_info.get('whiteCount', 0)} red={center_info.get('redCount', 0)} blue={center_info.get('blueCount', 0)} avgRGB=({center_info.get('avgR',0)},{center_info.get('avgG',0)},{center_info.get('avgB',0)})")
            
            print("[TEST 5] Final rest state after 18s")
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(IMG_DIR, "r5_05_final_rest.png"), full_page=True)
            
            final_info = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0, blueCount = 0, redCount = 0, whiteCount = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (b > 80 && b > r * 1.1) blueCount++;
                        if (r > 100 && r > b * 1.1) redCount++;
                        if (r > 180 && g > 180 && b > 180) whiteCount++;
                    }
                    return {
                        nonBlack, blueCount, redCount, whiteCount,
                        coveragePct: (nonBlack / (w * h) * 100).toFixed(2) + '%'
                    };
                }
            """)
            print(f"[INFO] Final rest: {final_info}")
            
            print("[TEST 6] WebGL status")
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
            
            print("[TEST 7] Color gradient check - fast movement then examine center pixel color")
            await page.mouse.move(960, 540)
            for i in range(20):
                await page.mouse.move(960 + (i % 2) * 200 - 100, 540 + (i // 2) * 100 - 200)
                await asyncio.sleep(0.03)
            await page.screenshot(path=os.path.join(IMG_DIR, "r5_06_color_check.png"), full_page=True)
            
            color_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width, h = canvas.height;
                    const cx = Math.floor(w/2), cy = Math.floor(h/2);
                    const blockSize = 60;
                    const pixels = new Uint8Array(blockSize * blockSize * 4);
                    gl.readPixels(cx - blockSize/2, cy - blockSize/2, blockSize, blockSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let rSum = 0, gSum = 0, bSum = 0;
                    let redDominant = 0, blueDominant = 0;
                    for (let i = 0; i < blockSize * blockSize; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            rSum += r; gSum += g; bSum += b;
                            if (r > b * 1.3 && r > 80) redDominant++;
                            if (b > r * 1.3 && b > 80) blueDominant++;
                        }
                    }
                    return {
                        sampleSize: blockSize * blockSize,
                        nonBlack, redDominant, blueDominant,
                        avgR: nonBlack > 0 ? Math.round(rSum / nonBlack) : 0,
                        avgG: nonBlack > 0 ? Math.round(gSum / nonBlack) : 0,
                        avgB: nonBlack > 0 ? Math.round(bSum / nonBlack) : 0
                    };
                }
            """)
            print(f"[INFO] Center color after fast move: {color_check}")
            
            if console_errors:
                all_issues.append(f"Console errors: {console_errors}")
            if page_errors:
                all_issues.append(f"Page errors: {page_errors}")
            
            if fast_info.get('whiteCount', 0) > fast_info.get('redCount', 0) * 2 and fast_info.get('nonBlack', 0) > 1000:
                all_issues.append(f"HIGH-SPEED COLOR FAILURE: After fast mouse movement, whiteCount={fast_info.get('whiteCount', 0)} >> redCount={fast_info.get('redCount', 0)}. Particles appear white instead of red. Expected: red > white.")
            
            if final_info.get('whiteCount', 0) > 100 and final_info.get('nonBlack', 0) > 0:
                all_issues.append(f"WHITE RESIDUAL FAILURE: After 18s rest, whiteCount={final_info.get('whiteCount', 0)} in full screen. Center residual white point not fully cleared. Expected: no white particles at rest.")
                
        except Exception as e:
            all_issues.append(f"Test exception: {str(e)}")
            print(f"[ERROR] {e}")
            try:
                await page.screenshot(path=os.path.join(IMG_DIR, "r5_00_error.png"), full_page=True)
            except:
                pass
        
        await browser.close()
    
    return all_issues

if __name__ == "__main__":
    issues = asyncio.run(test_round5())
    if issues:
        print(f"\n{'='*60}")
        print(f"[ISSUES FOUND] {len(issues)} issue(s):")
        for i, e in enumerate(issues):
            print(f"  {i+1}. {e}")
    else:
        print("\n[PASS] No issues found")
