#!/usr/bin/env python3
"""Round 4 Playwright test for city-walk-hotspot"""
import json, os, time, sys
import urllib.parse as urllib_parse
import requests
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/city-walk-hotspot/img/round4"
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
    page.on("requestfailed", lambda req: network_errors.append(f"[REQ_FAIL] {req.url}"))

    # Test 1: Load page
    print("TEST 1: Load page")
    page.goto("http://localhost:8000/", timeout=30000, wait_until="domcontentloaded")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_01_initial.png"))

    # Test 2: Check city switcher capsule exists and is visible
    print("TEST 2: City switcher capsule")
    capsule = page.query_selector(".city-switcher")
    if capsule:
        box = capsule.bounding_box()
        print(f"  capsule visible: {box}, x={box['x']}, y={box['y']}, w={box['width']}, h={box['height']}")
        pills = page.query_selector_all(".city-pill")
        for pill in pills:
            text = pill.text_content()
            is_active = pill.evaluate("el => el.classList.contains('active')")
            print(f"  pill: '{text}', active={is_active}")
        if len(pills) != 3:
            issues.append({"type": "capsule_count", "details": f"Expected 3 pills, found {len(pills)}"})
    else:
        issues.append({"type": "capsule_missing", "details": ".city-switcher not found in DOM"})

    # Test 3: Click Beijing pill
    print("TEST 3: Click Beijing pill")
    page.click(".city-pill.beijing")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_02_beijing_pill.png"))
    bj_center = page.evaluate("map.getCenter()")
    bj_zoom = page.evaluate("map.getZoom()")
    print(f"  Beijing center: {bj_center}, zoom: {bj_zoom}")
    # Check if center is in Beijing area (~39.9N, 116.4E)
    if abs(bj_center['lat'] - 39.93) > 0.5 or abs(bj_center['lng'] - 116.4) > 0.5:
        issues.append({"type": "pill_click", "details": f"Beijing pill click center is {bj_center}, expected ~39.93N,116.4E"})
    active_pill = page.query_selector(".city-pill.active")
    if active_pill and "北京" not in active_pill.text_content():
        issues.append({"type": "pill_active", "details": f"Active pill after Beijing click: {active_pill.text_content()}"})

    # Test 4: Click Shanghai pill
    print("TEST 4: Click Shanghai pill")
    page.click(".city-pill.shanghai")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_03_shanghai_pill.png"))
    sh_center = page.evaluate("map.getCenter()")
    sh_zoom = page.evaluate("map.getZoom()")
    print(f"  Shanghai center: {sh_center}, zoom: {sh_zoom}")
    if abs(sh_center['lat'] - 31.2) > 0.5 or abs(sh_center['lng'] - 121.45) > 0.5:
        issues.append({"type": "pill_click", "details": f"Shanghai pill click center is {sh_center}, expected ~31.2N,121.45E"})

    # Test 5: Click "全部城市" pill
    print("TEST 5: Click all cities pill")
    page.click(".city-pill.all")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_04_all_pill.png"))
    all_center = page.evaluate("map.getCenter()")
    all_zoom = page.evaluate("map.getZoom()")
    print(f"  All cities center: {all_center}, zoom: {all_zoom}")

    # Test 6: Check ALL route segments use walking paths
    print("TEST 6: All segments walking path check")
    # We'll check via the API - test each city's segments individually
    for city in ["上海", "北京"]:
        resp = requests.get(f"http://localhost:8000/api/routes?city={city}")
        data = resp.json()
        segments = data.get("overlay_segments", [])
        routes = data.get("routes", [])
        
        # Check each route's walking path
        for route in routes:
            route_id = route["route_id"]
            points = route.get("points", [])
            if len(points) >= 2:
                pts_param = json.dumps([{"lng": p["lng"], "lat": p["lat"]} for p in points])
                wp_resp = requests.get(f"http://localhost:8000/api/route/full_walking?points={urllib_parse.quote(pts_param)}")
                wp_data = wp_resp.json()
                coords = wp_data.get("coords", [])
                if len(coords) <= 2:
                    issues.append({"type": "walking_path_short", "details": f"Route {route_id} ({route['note_title']}) walking path has only {len(coords)} coords"})
                else:
                    print(f"  {route_id}: {len(coords)} walking coords (OK)")

        # Check each segment's walking path by calling the segment-level walking API
        for seg in segments:
            start_lng = seg["start"]["lng"]
            start_lat = seg["start"]["lat"]
            end_lng = seg["end"]["lng"]
            end_lat = seg["end"]["lat"]
            try:
                wp_resp = requests.get(
                    f"http://localhost:8000/api/route/walking?origin_lng={start_lng}&origin_lat={start_lat}&dest_lng={end_lng}&dest_lat={end_lat}"
                )
                wp_data = wp_resp.json()
                coords = wp_data.get("coords", [])
                if len(coords) <= 2:
                    issues.append({
                        "type": "segment_straight_line",
                        "details": f"Segment {seg['start_name']}->{seg['end_name']} has only {len(coords)} walking coords (likely straight line)"
                    })
                else:
                    print(f"  Segment {seg['start_name']}->{seg['end_name']}: {len(coords)} walking coords (OK)")
            except Exception as e:
                issues.append({"type": "segment_walking_error", "details": f"Segment {seg['start_name']}->{seg['end_name']} error: {e}"})

    # Test 7: Visual check - zoom in on Shanghai and see if lines follow roads
    print("TEST 7: Shanghai close-up visual check")
    page.click(".city-pill.shanghai")
    time.sleep(8)
    page.evaluate("map.setView([31.215, 121.44], 16)")
    time.sleep(2)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_05_shanghai_zoom16.png"))

    # Test 8: Close-up Beijing
    print("TEST 8: Beijing close-up visual check")
    page.click(".city-pill.beijing")
    time.sleep(8)
    page.evaluate("map.setView([39.94, 116.385], 16)")
    time.sleep(2)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_06_beijing_zoom16.png"))

    # Test 9: All-city view with zoom
    print("TEST 9: All-city overview")
    page.click(".city-pill.all")
    time.sleep(8)
    page.screenshot(path=os.path.join(IMG_DIR, "r4_07_final.png"))

    # Test 10: Console errors
    print("TEST 10: Console errors")
    for err in console_errors:
        print(f"  {err}")
        if "404" in err or "Failed" in err or "favicon" not in err:
            issues.append({"type": "console_error", "details": err})

    browser.close()

with open(os.path.join(IMG_DIR, "test_issues_round4.json"), "w", encoding="utf-8") as f:
    json.dump({"issues": issues, "timestamp": time.time()}, f, ensure_ascii=False, indent=2)

print()
print("=== ISSUES ===")
for i, iss in enumerate(issues, 1):
    print(f"  {i}. [{iss['type']}] {iss['details']}")
if not issues:
    print("  No issues found")
