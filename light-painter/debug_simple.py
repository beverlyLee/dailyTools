#!/usr/bin/env python3
import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5220", wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)
    page.screenshot(path="/Users/liboyang/trae/dailyTools/light-painter/img/debug_simple.png")
    print("Screenshot taken")
    browser.close()
    print("Done")
