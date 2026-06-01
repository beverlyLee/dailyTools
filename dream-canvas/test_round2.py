import asyncio
from playwright.async_api import async_playwright
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/dream-canvas/img"

async def test_round2():
    os.makedirs(IMG_DIR, exist_ok=True)
    all_errors = []
    
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
            print("[INFO] Page loaded, waiting 3s for particles to initialize...")
            await asyncio.sleep(3)
            
            print("[TEST 1] Initial state - taking screenshot")
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_01_initial.png"), full_page=True)
            
            initial_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let brightPixels = 0;
                    let bluePixels = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            if (r > 100 || g > 100 || b > 100) brightPixels++;
                            if (b > 80 && b > r) bluePixels++;
                        }
                    }
                    return {
                        totalPixels: w * h,
                        nonBlackPixels: nonBlack,
                        brightPixels: brightPixels,
                        bluePixels: bluePixels,
                        coverage: (nonBlack / (w * h) * 100).toFixed(2) + '%'
                    };
                }
            """)
            print(f"[INFO] Initial coverage: {initial_check.get('coverage', 'N/A')}, nonBlack: {initial_check.get('nonBlackPixels', 0)}, blue: {initial_check.get('bluePixels', 0)}")
            
            print("[TEST 2] Moving mouse across screen...")
            for i, (x, y) in enumerate([(400, 300), (700, 500), (1000, 400), (1300, 600), (960, 540)]):
                await page.mouse.move(x, y)
                await asyncio.sleep(0.8)
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_02_mouse_move.png"), full_page=True)
            print("  - Mouse move screenshot taken")
            
            move_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let redPixels = 0;
                    let bluePixels = 0;
                    let nonBlack = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) nonBlack++;
                        if (r > 80 && r > b) redPixels++;
                        if (b > 80 && b > r) bluePixels++;
                    }
                    return { nonBlackPixels: nonBlack, redPixels, bluePixels };
                }
            """)
            print(f"[INFO] After move - nonBlack: {move_check.get('nonBlackPixels', 0)}, red: {move_check.get('redPixels', 0)}, blue: {move_check.get('bluePixels', 0)}")
            
            print("[TEST 3] Stopping mouse at center, waiting 15s for restore...")
            await page.mouse.move(960, 540)
            
            for sec in [3, 6, 9, 12, 15]:
                await asyncio.sleep(3)
                path = os.path.join(IMG_DIR, f"r2_03_restore_{sec}s.png")
                await page.screenshot(path=path, full_page=True)
                print(f"  - Screenshot at {sec}s saved")
            
            print("[TEST 4] Final check after 18s rest")
            await asyncio.sleep(3)
            await page.screenshot(path=os.path.join(IMG_DIR, "r2_04_final_rest.png"), full_page=True)
            
            final_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    let nonBlack = 0;
                    let bluePixels = 0;
                    let redPixels = 0;
                    for (let i = 0; i < w * h; i++) {
                        const idx = i * 4;
                        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
                        if (r > 0 || g > 0 || b > 0) {
                            nonBlack++;
                            if (r > 80) redPixels++;
                            if (b > 80) bluePixels++;
                        }
                    }
                    return {
                        totalPixels: w * h,
                        nonBlackPixels: nonBlack,
                        bluePixels: bluePixels,
                        redPixels: redPixels,
                        coverage: (nonBlack / (w * h) * 100).toFixed(2) + '%'
                    };
                }
            """)
            print(f"[INFO] Final coverage: {final_check.get('coverage', 'N/A')}, nonBlack: {final_check.get('nonBlackPixels', 0)}, blue: {final_check.get('bluePixels', 0)}, red: {final_check.get('redPixels', 0)}")
            
            print("[TEST 5] WebGL status check")
            webgl_check = await page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return { error: 'no canvas' };
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return { error: 'no webgl' };
                    const err = gl.getError();
                    return { webglError: err, width: canvas.width, height: canvas.height };
                }
            """)
            print(f"[INFO] WebGL: {webgl_check}")
            
            if console_errors:
                all_errors.append(f"Console errors: {console_errors}")
            if page_errors:
                all_errors.append(f"Page errors: {page_errors}")
            
            if final_check.get('nonBlackPixels', 0) < 1000:
                all_errors.append(f"FINAL RESTORE FAILURE: After 18s rest, only {final_check.get('nonBlackPixels', 0)} non-black pixels remain (coverage: {final_check.get('coverage', 'N/A')}), particles have effectively disappeared. Expected: particles should be visible and restored to blue.")
            
            if initial_check.get('nonBlackPixels', 0) > 0 and final_check.get('nonBlackPixels', 0) < initial_check.get('nonBlackPixels', 0) * 0.3:
                all_errors.append(f"PARTICLE LOSS: Initial non-black pixels: {initial_check.get('nonBlackPixels', 0)}, Final: {final_check.get('nonBlackPixels', 0)}. Over 70% of particles lost during restore cycle.")
                
        except Exception as e:
            all_errors.append(f"Test exception: {str(e)}")
            print(f"[ERROR] {e}")
        
        await browser.close()
    
    return all_errors

if __name__ == "__main__":
    errors = asyncio.run(test_round2())
    if errors:
        print(f"\n{'='*60}")
        print(f"[ISSUES FOUND] {len(errors)} issue(s):")
        for i, e in enumerate(errors):
            print(f"  {i+1}. {e}")
    else:
        print("\n[PASS] No issues found")
