#!/usr/bin/env python3
"""Debug - check if page loads and canvas exists"""

import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    
    errors = []
    page.on("console", lambda msg: errors.append(f"[console:{msg.type}] {msg.text}"))
    page.on("pageerror", lambda exc: errors.append(f"[pageerror] {exc.message}"))
    
    page.goto("http://localhost:5220", wait_until="domcontentloaded", timeout=30000)
    time.sleep(5)
    
    # Check page content
    html = page.content()
    print("Page HTML length:", len(html))
    
    # Check for canvas
    canvas_count = page.evaluate("document.querySelectorAll('canvas').length")
    print("Canvas elements found:", canvas_count)
    
    # Check app div
    app_content = page.evaluate("document.getElementById('app')?.innerHTML?.substring(0, 200) || 'NO APP'")
    print("App content:", app_content[:200])
    
    # Check errors
    if errors:
        print("\nERRORS:")
        for e in errors[:10]:
            print(f"  {e}")
    else:
        print("\nNo console errors")
    
    # Take screenshot
    img = page.screenshot()
    with open("/Users/liboyang/trae/dailyTools/light-painter/img/debug_page.png", "wb") as f:
        f.write(img)
    print("\nScreenshot saved to debug_page.png")
    
    browser.close()
