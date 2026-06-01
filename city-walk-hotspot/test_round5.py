#!/usr/bin/env python3
"""Round 5 Playwright test for city-walk-hotspot"""
import json, os, time, sys
import urllib.parse as urllib_parse
import requests
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/city-walk-hotspot/img/round5"
os.makedirs(IMG_DIR, exist_ok=True)

issues = []
all_api_calls = []
segment_api_calls = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    console_errors = []
    console_warnings = []
    
    def handle_console(msg):
        text = f"[{msg.type}] {msg.text}"
        if msg.type == "error":
            console_errors.append(text)
        elif msg.type == "warning":
            console_warnings.append(text)
    
    page.on("console", handle_console)
    page.on("pageerror", lambda err: console_errors.append(f"[PAGE_ERROR] {err}"))
    
    # Track API calls
    def handle_request(request):
        url = request.url
        if "/api/route/walking" in url or "/api/route/full_walking" in url:
            all_api_calls.append({"url": url, "type": "walking"})
            if "/api/route/walking" in url and "origin_lng" in url:
                segment_api_calls.append(url)
    
    page.on("request", handle_request)

    # Test 1: Load page
    print("TEST 1: Load page")
    page.goto("http://localhost:8000/", timeout=30000, wait_until="domcontentloaded")
    time.sleep(15)  # Wait for all walking path requests
    page.screenshot(path=os.path.join(IMG_DIR, "r5_01_initial.png"))
    
    initial_api_count = len(all_api_calls)
    initial_segment_count = len(segment_api_calls)
    print(f"  Initial API calls: {initial_api_count}")
    print(f"  Initial segment API calls: {initial_segment_count}")

    # Test 2: Check city switcher
    print("TEST 2: City switcher")
    pills = page.query_selector_all(".city-pill")
    pill_texts = [p.text_content() for p in pills]
    print(f"  Pills: {pill_texts}")
    
    if len(pills) != 3:
        issues.append({"type": "capsule_count", "details": f"Expected 3 pills, found {len(pills)}"})

    # Test 3: Click Shanghai pill
    print("TEST 3: Click Shanghai pill")
    all_api_calls.clear()
    segment_api_calls.clear()
    page.click(".city-pill.shanghai")
    time.sleep(15)
    page.screenshot(path=os.path.join(IMG_DIR, "r5_02_shanghai.png"))
    
    shanghai_api_count = len(all_api_calls)
    shanghai_segment_count = len(segment_api_calls)
    print(f"  Shanghai API calls: {shanghai_api_count}")
    print(f"  Shanghai segment API calls: {shanghai_segment_count}")
    
    if shanghai_segment_count > 0:
        issues.append({
            "type": "unnecessary_segment_requests",
            "details": f"Shanghai still made {shanghai_segment_count} segment-level walking requests"
        })

    # Test 4: Click Beijing pill
    print("TEST 4: Click Beijing pill")
    all_api_calls.clear()
    segment_api_calls.clear()
    page.click(".city-pill.beijing")
    time.sleep(15)
    page.screenshot(path=os.path.join(IMG_DIR, "r5_03_beijing.png"))
    
    beijing_api_count = len(all_api_calls)
    beijing_segment_count = len(segment_api_calls)
    print(f"  Beijing API calls: {beijing_api_count}")
    print(f"  Beijing segment API calls: {beijing_segment_count}")
    
    if beijing_segment_count > 0:
        issues.append({
            "type": "unnecessary_segment_requests",
            "details": f"Beijing still made {beijing_segment_count} segment-level walking requests"
        })

    # Test 5: Check for failed segments
    print("TEST 5: Check for failed segments")
    # Check console warnings for "路径规划失败" or "插值"
    for warning in console_warnings:
        if "失败" in warning or "插值" in warning or "近似" in warning:
            issues.append({
                "type": "failed_segments",
                "details": f"Console warning indicates failed segments: {warning}"
            })
    
    # Check for 500 errors
    for error in console_errors:
        if "500" in error or "路径规划失败" in error:
            issues.append({
                "type": "api_500_error",
                "details": f"API 500 error detected: {error}"
            })

    # Test 6: Check cache status
    print("TEST 6: Check cache status")
    try:
        resp = requests.get("http://localhost:8000/api/cache/status")
        cache_status = resp.json()
        print(f"  Cache status: {cache_status}")
    except Exception as e:
        issues.append({"type": "cache_check_error", "details": str(e)})

    # Test 7: Verify all segments use walking paths
    print("TEST 7: Verify all segments use walking paths")
    for city in ["上海", "北京"]:
        try:
            resp = requests.get(f"http://localhost:8000/api/routes?city={city}")
            data = resp.json()
            segments = data.get("overlay_segments", [])
            
            for seg in segments:
                start_lng = seg["start"]["lng"]
                start_lat = seg["start"]["lat"]
                end_lng = seg["end"]["lng"]
                end_lat = seg["end"]["lat"]
                
                # Check if walking path exists in cache
                cache_key = f"{round(start_lng, 6)},{round(start_lat, 6)}-{round(end_lng, 6)},{round(end_lat, 6)}"
                
                # Try to get walking path
                wp_resp = requests.get(
                    f"http://localhost:8000/api/route/walking?origin_lng={start_lng}&origin_lat={start_lat}&dest_lng={end_lng}&dest_lat={end_lat}"
                )
                wp_data = wp_resp.json()
                
                if "error" in wp_data:
                    issues.append({
                        "type": "walking_path_error",
                        "details": f"Segment {seg['start_name']}->{seg['end_name']} error: {wp_data['error']}"
                    })
                elif len(wp_data.get("coords", [])) <= 2:
                    issues.append({
                        "type": "straight_line",
                        "details": f"Segment {seg['start_name']}->{seg['end_name']} has only {len(wp_data.get('coords', []))} coords (likely straight line)"
                    })
        except Exception as e:
            issues.append({"type": "verification_error", "details": f"{city}: {e}"})

    # Test 8: Final screenshot
    print("TEST 8: Final overview")
    page.click(".city-pill.all")
    time.sleep(10)
    page.screenshot(path=os.path.join(IMG_DIR, "r5_04_final.png"))

    # Test 9: Console errors check
    print("TEST 9: Console errors")
    print(f"  Errors: {len(console_errors)}")
    print(f"  Warnings: {len(console_warnings)}")
    
    for err in console_errors:
        print(f"    ERROR: {err}")
    for warn in console_warnings:
        print(f"    WARN: {warn}")

    browser.close()

# Save issues
with open(os.path.join(IMG_DIR, "test_issues_round5.json"), "w", encoding="utf-8") as f:
    json.dump({
        "issues": issues,
        "timestamp": time.time(),
        "api_stats": {
            "shanghai_segment_calls": shanghai_segment_count if 'shanghai_segment_count' in dir() else 0,
            "beijing_segment_calls": beijing_segment_count if 'beijing_segment_count' in dir() else 0
        }
    }, f, ensure_ascii=False, indent=2)

print()
print("=== ISSUES ===")
for i, iss in enumerate(issues, 1):
    print(f"  {i}. [{iss['type']}] {iss['details']}")
if not issues:
    print("  No issues found")
