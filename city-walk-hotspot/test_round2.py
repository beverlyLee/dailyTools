#!/usr/bin/env python3
"""Round 2 Playwright test for city-walk-hotspot"""
import json, os, time
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/city-walk-hotspot/img/round2"
os.makedirs(IMG_DIR, exist_ok=True)

issues = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    console_errors = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: console_errors.append(f"[PAGE_ERROR] {err}"))

    # Test 1: Load
    print("TEST 1: Load page")
    page.goto("http://localhost:8000/", timeout=30000, wait_until="domcontentloaded")
    time.sleep(6)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_01_initial.png"))

    # Test 2: Check config API
    print("TEST 2: Check config API")
    try:
        cfg = page.evaluate("fetch('/api/config').then(r=>r.json())")
        has_js = bool(cfg.get("gaode_js_api_key"))
        has_key = bool(cfg.get("gaode_api_key"))
        print(f"  gaode_js_api_key present: {has_js}")
        print(f"  gaode_api_key present: {has_key}")
        if not has_js:
            issues.append({"type": "config_missing", "details": "/api/config not returning gaode_js_api_key"})
    except Exception as e:
        issues.append({"type": "config_error", "details": str(e)})

    # Test 3: Verify tile layer uses Gaode
    print("TEST 3: Check tile source")
    tile_src = page.evaluate("document.querySelector('.leaflet-tile')?.src || 'no-tile'")
    print(f"  tile src: {tile_src[:150]}")
    if "autonavi" not in tile_src and "gaode" not in tile_src:
        time.sleep(3)
        tile_src = page.evaluate("document.querySelector('.leaflet-tile')?.src || 'no-tile'")
        print(f"  tile src (retry): {tile_src[:150]}")
    if "autonavi" in tile_src or "gaode" in tile_src:
        print("  OK: Using Gaode tiles")
    else:
        print("  FAIL: Not using Gaode")
        issues.append({"type": "tile_source", "details": f"Not using Gaode: {tile_src[:150]}"})

    # Test 4: City options
    print("TEST 4: City options")
    opts = page.evaluate("Array.from(document.querySelectorAll('#citySelect option')).map(o=>o.value)")
    print(f"  cities: {opts}")

    # Test 5: Shanghai
    print("TEST 5: Select Shanghai")
    page.select_option("#citySelect", "上海")
    time.sleep(3)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_02_shanghai.png"))
    sh_data = page.evaluate("currentData")
    if sh_data:
        apic = sh_data.get("core_paths_count")
        cplen = len(sh_data.get("core_paths", []))
        print(f"  core_paths_count={apic}, core_paths.length={cplen}")
        segs = sh_data.get("overlay_segments", [])
        overlaps = [s["overlap_count"] for s in segs]
        widths = [s["line_width"] for s in segs]
        print(f"  overlaps: {overlaps}")
        print(f"  widths: {widths}")
        max_ov = max(overlaps)
        max_w = max(widths)
        for s in segs:
            if s["overlap_count"] == max_ov:
                print(f"  max-ov seg: {s['start_name']}->{s['end_name']} ov={s['overlap_count']} w={s['line_width']} heat={s['heat_level']}")
                if s["line_width"] != max_w:
                    issues.append({"type": "line_width_bug", "details": f"Max-overlap segment {s['start_name']}->{s['end_name']} ov={s['overlap_count']} has w={s['line_width']} but max_w={max_w}"})

    # Test 6: Core paths stat
    print("TEST 6: Core paths display")
    disp = page.evaluate("document.getElementById('corePaths').textContent")
    apic = sh_data.get("core_paths_count") if sh_data else None
    print(f"  displayed={disp}, api={apic}")
    if str(disp) != str(apic):
        issues.append({"type": "stat_mismatch", "details": f"Shanghai displayed={disp} api={apic}"})

    # Test 7: Beijing
    print("TEST 7: Select Beijing")
    page.select_option("#citySelect", "北京")
    time.sleep(3)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_03_beijing.png"))

    # Test 8: Chinese path API
    print("TEST 8: Chinese path API")
    for city in ["上海", "北京"]:
        try:
            resp = page.evaluate(f"fetch('/api/routes/{city}').then(r => r.json())")
            ok = "error" not in resp
            print(f"  /api/routes/{city}: {'OK' if ok else 'FAIL'} {str(resp)[:120]}")
            if not ok:
                issues.append({"type": "api_404", "details": f"/api/routes/{city} returned {resp}"})
        except Exception as e:
            print(f"  /api/routes/{city}: EXC {e}")
            issues.append({"type": "api_exception", "details": f"/api/routes/{city}: {e}"})

    # Test 9: Toggle heat off
    print("TEST 9: Toggle heat off")
    page.select_option("#citySelect", "上海")
    time.sleep(2)
    page.uncheck("#showHeat")
    time.sleep(1)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_04_heat_off.png"))
    page.check("#showHeat")
    time.sleep(1)

    # Test 10: Platform filter
    print("TEST 10: Platform filter")
    page.select_option("#citySelect", "")
    page.select_option("#platformSelect", "小红书")
    time.sleep(3)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_05_xiaohongshu.png"))

    # Test 11: Route click
    print("TEST 11: Click route")
    page.select_option("#citySelect", "上海")
    page.select_option("#platformSelect", "")
    time.sleep(2)
    page.click(".route-item")
    time.sleep(2)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_06_route_click.png"))

    # Test 12: Final
    print("TEST 12: Final overview")
    page.select_option("#citySelect", "")
    page.select_option("#platformSelect", "")
    time.sleep(3)
    page.screenshot(path=os.path.join(IMG_DIR, "r2_07_final.png"))

    # Test 13: Console errors
    print("TEST 13: Console errors")
    for err in console_errors:
        print(f"  {err}")
    if console_errors:
        issues.append({"type": "console_errors", "details": console_errors})

    browser.close()

with open(os.path.join(IMG_DIR, "test_issues_round2.json"), "w", encoding="utf-8") as f:
    json.dump({"issues": issues, "timestamp": time.time()}, f, ensure_ascii=False, indent=2)

print()
print("=== ISSUES ===")
for i, iss in enumerate(issues, 1):
    print(f"  {i}. [{iss['type']}] {iss['details']}")
if not issues:
    print("  No issues found")
