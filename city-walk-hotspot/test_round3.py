#!/usr/bin/env python3
"""Round 3 Playwright test for city-walk-hotspot"""
import json, os, time
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/city-walk-hotspot/img/round3"
os.makedirs(IMG_DIR, exist_ok=True)

issues = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    console_errors = []
    network_errors = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: console_errors.append(f"[PAGE_ERROR] {err}"))
    page.on("requestfailed", lambda req: network_errors.append(f"[REQ_FAIL] {req.url} {req.failure}"))

    # Test 1: Load
    print("TEST 1: Load page")
    page.goto("http://localhost:8000/", timeout=30000, wait_until="domcontentloaded")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_01_initial.png"))

    # Test 2: Check initial map viewport
    print("TEST 2: Initial bounds")
    bounds = page.evaluate("map.getBounds()")
    center = page.evaluate("map.getCenter()")
    zoom = page.evaluate("map.getZoom()")
    print(f"  bounds: {bounds}")
    print(f"  center: {center}")
    print(f"  zoom: {zoom}")
    # check if bounds include both Shanghai and Beijing
    sh_lat, sh_lng = 31.2, 121.45
    bj_lat, bj_lng = 39.93, 116.4
    try:
        covers_sh = page.evaluate(f"map.getBounds().contains([{sh_lat}, {sh_lng}])")
        covers_bj = page.evaluate(f"map.getBounds().contains([{bj_lat}, {bj_lng}])")
        print(f"  covers Shanghai: {covers_sh}")
        print(f"  covers Beijing: {covers_bj}")
        if not covers_sh or not covers_bj:
            issues.append({"type": "initial_bounds", "details": f"Initial view does not cover both cities. sh={covers_sh}, bj={covers_bj}, bounds={bounds}"})
    except Exception as e:
        issues.append({"type": "initial_bounds_check", "details": str(e)})

    # Test 3: Check walking path API is called
    print("TEST 3: Check walking path data")
    routes_data = page.evaluate("currentData?.routes?.map(r => ({id: r.route_id, title: r.note_title, points: r.points?.length}))")
    print(f"  routes: {routes_data}")

    # Test 4: Check if walking path coords are present in rendered lines
    print("TEST 4: Check polyline segments")
    seg_count = page.evaluate("document.querySelectorAll('.leaflet-overlay-pane svg path').length")
    print(f"  polyline count: {seg_count}")

    # Test 5: Check walking path data returned from backend
    print("TEST 5: Test full_walking API")
    for city in ["上海", "北京"]:
        try:
            data = page.evaluate(f"fetch('/api/routes?city={city}').then(r=>r.json())")
            if data.get("routes"):
                first_route = data["routes"][0]
                points = first_route.get("points", [])
                print(f"  {city} first route: {first_route['note_title']}, points={len(points)}")
                if points:
                    pts_param = json.dumps([{"lng": p["lng"], "lat": p["lat"]} for p in points])
                    import urllib.parse
                    import requests
                    resp = requests.get(f"http://localhost:8000/api/route/full_walking?points={urllib.parse.quote(pts_param)}")
                    wp = resp.json()
                    coords = wp.get("coords", [])
                    print(f"  walking path coords count: {len(coords)}")
                    if len(coords) <= 2:
                        issues.append({"type": "walking_path", "details": f"{city} route {first_route['note_title']} walking path has only {len(coords)} coords (should be >2 for realistic path)"})
        except Exception as e:
            print(f"  {city} error: {e}")
            issues.append({"type": "walking_api_error", "details": f"{city}: {e}"})

    # Test 6: Select Shanghai
    print("TEST 6: Select Shanghai")
    page.select_option("#citySelect", "上海")
    time.sleep(8)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_02_shanghai.png"))

    # Check bounds after shanghai
    sh_bounds = page.evaluate("map.getBounds()")
    sh_zoom = page.evaluate("map.getZoom()")
    print(f"  Shanghai bounds: {sh_bounds}, zoom: {sh_zoom}")

    # Test 7: Select Beijing
    print("TEST 7: Select Beijing")
    page.select_option("#citySelect", "北京")
    time.sleep(8)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_03_beijing.png"))

    bj_bounds = page.evaluate("map.getBounds()")
    bj_zoom = page.evaluate("map.getZoom()")
    print(f"  Beijing bounds: {bj_bounds}, zoom: {bj_zoom}")

    # Test 8: Toggle heat
    print("TEST 8: Toggle heat off")
    page.uncheck("#showHeat")
    time.sleep(1)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_04_heat_off.png"))
    page.check("#showHeat")
    time.sleep(1)

    # Test 9: Platform filter
    print("TEST 9: Platform filter")
    page.select_option("#citySelect", "")
    page.select_option("#platformSelect", "小红书")
    time.sleep(8)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_05_xiaohongshu.png"))

    # Test 10: Route click
    print("TEST 10: Route click")
    page.select_option("#citySelect", "上海")
    page.select_option("#platformSelect", "")
    time.sleep(6)
    page.click(".route-item")
    time.sleep(3)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_06_route_click.png"))

    # Test 11: Final all-city
    print("TEST 11: Final all-city")
    page.select_option("#citySelect", "")
    page.select_option("#platformSelect", "")
    time.sleep(8)
    page.screenshot(path=os.path.join(IMG_DIR, "r3_07_final.png"))

    # Test 12: Console & network errors
    print("TEST 12: Console/network errors")
    for err in console_errors:
        print(f"  CONSOLE: {err}")
    for err in network_errors:
        print(f"  NETWORK: {err}")
    if console_errors:
        issues.append({"type": "console_errors", "details": console_errors})
    if network_errors:
        issues.append({"type": "network_errors", "details": network_errors})

    browser.close()

with open(os.path.join(IMG_DIR, "test_issues_round3.json"), "w", encoding="utf-8") as f:
    json.dump({"issues": issues, "timestamp": time.time()}, f, ensure_ascii=False, indent=2)

print()
print("=== ISSUES ===")
for i, iss in enumerate(issues, 1):
    print(f"  {i}. [{iss['type']}] {iss['details']}")
if not issues:
    print("  No issues found")
