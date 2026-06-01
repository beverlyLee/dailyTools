#!/usr/bin/env python3
"""Playwright test script for city-walk-hotspot"""
import json
import os
import time
from playwright.sync_api import sync_playwright, Page, Browser

IMG_DIR = "/Users/liboyang/trae/dailyTools/city-walk-hotspot/img"
os.makedirs(IMG_DIR, exist_ok=True)

def log_console(msg):
    print(f"[CONSOLE {msg.type}] {msg.text}")

def test_page():
    issues = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(f"[PAGE_ERROR] {err}"))
        
        # Test 1: Load main page
        print("=" * 60)
        print("TEST 1: Loading main page")
        print("=" * 60)
        try:
            page.goto("http://localhost:8000/", timeout=30000, wait_until="domcontentloaded")
            time.sleep(5)
            
            page.screenshot(path=os.path.join(IMG_DIR, "01_initial_load.png"), full_page=True)
            print("Screenshot saved: 01_initial_load.png")
            
            # Check for console errors
            if console_errors:
                print(f"Console errors found: {console_errors}")
                issues.append({"type": "console_error", "details": console_errors})
            else:
                print("No console errors on initial load")
                
        except Exception as e:
            print(f"ERROR loading page: {e}")
            issues.append({"type": "load_error", "details": str(e)})
            browser.close()
            return issues
        
        # Test 2: Check page title and basic elements
        print("\n" + "=" * 60)
        print("TEST 2: Checking page elements")
        print("=" * 60)
        try:
            title = page.title()
            print(f"Page title: {title}")
            
            # Check header
            header = page.query_selector(".header")
            if header:
                print("Header found ✓")
            else:
                print("Header NOT FOUND ✗")
                issues.append({"type": "missing_element", "details": "Header not found"})
            
            # Check map
            map_elem = page.query_selector("#map")
            if map_elem:
                print("Map container found ✓")
            else:
                print("Map container NOT FOUND ✗")
                issues.append({"type": "missing_element", "details": "Map container (#map) not found"})
            
            # Check sidebar
            sidebar = page.query_selector(".sidebar")
            if sidebar:
                print("Sidebar found ✓")
            else:
                print("Sidebar NOT FOUND ✗")
                issues.append({"type": "missing_element", "details": "Sidebar not found"})
                
        except Exception as e:
            print(f"ERROR checking elements: {e}")
            issues.append({"type": "element_check_error", "details": str(e)})
        
        # Test 3: Check city dropdown
        print("\n" + "=" * 60)
        print("TEST 3: Checking city dropdown")
        print("=" * 60)
        try:
            city_select = page.query_selector("#citySelect")
            if city_select:
                options = city_select.query_selector_all("option")
                city_names = [opt.get_attribute("value") for opt in options]
                print(f"City options: {city_names}")
                if len(city_names) < 2:
                    issues.append({"type": "missing_data", "details": f"Expected at least 2 cities, got {len(city_names)}: {city_names}"})
            else:
                print("City select NOT FOUND ✗")
                issues.append({"type": "missing_element", "details": "City dropdown (#citySelect) not found"})
                
        except Exception as e:
            print(f"ERROR checking city dropdown: {e}")
            issues.append({"type": "city_dropdown_error", "details": str(e)})
        
        # Test 4: Check platform dropdown
        print("\n" + "=" * 60)
        print("TEST 4: Checking platform dropdown")
        print("=" * 60)
        try:
            platform_select = page.query_selector("#platformSelect")
            if platform_select:
                options = platform_select.query_selector_all("option")
                platform_names = [opt.get_attribute("value") for opt in options]
                print(f"Platform options: {platform_names}")
            else:
                print("Platform select NOT FOUND ✗")
                issues.append({"type": "missing_element", "details": "Platform dropdown (#platformSelect) not found"})
                
        except Exception as e:
            print(f"ERROR checking platform dropdown: {e}")
            issues.append({"type": "platform_dropdown_error", "details": str(e)})
        
        # Test 5: Check stats cards
        print("\n" + "=" * 60)
        print("TEST 5: Checking stats cards")
        print("=" * 60)
        try:
            stats_to_check = [
                ("totalRoutes", "路线总数"),
                ("avgHotness", "平均热度"),
                ("corePaths", "核心路段"),
                ("maxHotness", "最高热度"),
                ("commercialScore", "商业化指数"),
                ("poiDensity", "POI密度"),
            ]
            for stat_id, stat_name in stats_to_check:
                elem = page.query_selector(f"#{stat_id}")
                if elem:
                    value = elem.inner_text()
                    print(f"{stat_name} ({stat_id}): {value}")
                    if value == "0" or value == "":
                        issues.append({"type": "empty_stat", "details": f"Stat '{stat_name}' is empty or 0"})
                else:
                    print(f"{stat_name} NOT FOUND ✗")
                    issues.append({"type": "missing_element", "details": f"Stat element #{stat_id} not found"})
                    
        except Exception as e:
            print(f"ERROR checking stats: {e}")
            issues.append({"type": "stats_error", "details": str(e)})
        
        # Test 6: Select Shanghai city and check
        print("\n" + "=" * 60)
        print("TEST 6: Selecting Shanghai city")
        print("=" * 60)
        try:
            page.select_option("#citySelect", "上海")
            time.sleep(3)
            page.screenshot(path=os.path.join(IMG_DIR, "02_shanghai_selected.png"), full_page=True)
            print("Screenshot saved: 02_shanghai_selected.png")
            
            # Check map has content
            route_items = page.query_selector_all(".route-item")
            print(f"Route items found for Shanghai: {len(route_items)}")
            if len(route_items) == 0:
                issues.append({"type": "missing_data", "details": "No route items found for Shanghai city"})
            
            # Check console errors after city change
            if console_errors:
                new_errors = [e for e in console_errors if "CONSOLE error" in e or "PAGE_ERROR" in e]
                if new_errors:
                    print(f"New console errors after city change: {new_errors}")
                    
        except Exception as e:
            print(f"ERROR selecting Shanghai: {e}")
            issues.append({"type": "city_select_error", "details": str(e)})
        
        # Test 7: Select Beijing city and check
        print("\n" + "=" * 60)
        print("TEST 7: Selecting Beijing city")
        print("=" * 60)
        try:
            page.select_option("#citySelect", "北京")
            time.sleep(3)
            page.screenshot(path=os.path.join(IMG_DIR, "03_beijing_selected.png"), full_page=True)
            print("Screenshot saved: 03_beijing_selected.png")
            
            route_items = page.query_selector_all(".route-item")
            print(f"Route items found for Beijing: {len(route_items)}")
            if len(route_items) == 0:
                issues.append({"type": "missing_data", "details": "No route items found for Beijing city"})
                
        except Exception as e:
            print(f"ERROR selecting Beijing: {e}")
            issues.append({"type": "city_select_error", "details": str(e)})
        
        # Test 8: Toggle controls
        print("\n" + "=" * 60)
        print("TEST 8: Testing toggle controls")
        print("=" * 60)
        try:
            # Select Shanghai first
            page.select_option("#citySelect", "上海")
            time.sleep(2)
            
            # Toggle off heat routes
            show_heat = page.query_selector("#showHeat")
            if show_heat:
                show_heat.uncheck()
                time.sleep(1)
                page.screenshot(path=os.path.join(IMG_DIR, "04_heat_toggled_off.png"), full_page=True)
                print("Screenshot saved: 04_heat_toggled_off.png")
                show_heat.check()
                time.sleep(1)
            
            # Toggle off POI
            show_poi = page.query_selector("#showPOI")
            if show_poi:
                show_poi.uncheck()
                time.sleep(1)
                page.screenshot(path=os.path.join(IMG_DIR, "05_poi_toggled_off.png"), full_page=True)
                print("Screenshot saved: 05_poi_toggled_off.png")
                show_poi.check()
                time.sleep(1)
            
            # Toggle off markers
            show_markers = page.query_selector("#showMarkers")
            if show_markers:
                show_markers.uncheck()
                time.sleep(1)
                page.screenshot(path=os.path.join(IMG_DIR, "06_markers_toggled_off.png"), full_page=True)
                print("Screenshot saved: 06_markers_toggled_off.png")
                show_markers.check()
                time.sleep(1)
                
        except Exception as e:
            print(f"ERROR toggling controls: {e}")
            issues.append({"type": "toggle_error", "details": str(e)})
        
        # Test 9: Click a route item
        print("\n" + "=" * 60)
        print("TEST 9: Testing route item click")
        print("=" * 60)
        try:
            page.select_option("#citySelect", "上海")
            time.sleep(2)
            
            route_items = page.query_selector_all(".route-item")
            if route_items:
                route_items[0].click()
                time.sleep(2)
                page.screenshot(path=os.path.join(IMG_DIR, "07_route_clicked.png"), full_page=True)
                print("Screenshot saved: 07_route_clicked.png")
                
                # Check if route item has active class
                class_attr = route_items[0].get_attribute("class")
                print(f"Route item class after click: {class_attr}")
                if "active" not in (class_attr or ""):
                    print("WARNING: Route item doesn't have 'active' class after click")
            else:
                print("No route items to click")
                issues.append({"type": "missing_data", "details": "No route items available to click"})
                
        except Exception as e:
            print(f"ERROR clicking route: {e}")
            issues.append({"type": "route_click_error", "details": str(e)})
        
        # Test 10: Select platform
        print("\n" + "=" * 60)
        print("TEST 10: Testing platform filter")
        print("=" * 60)
        try:
            page.select_option("#citySelect", "")  # reset city
            page.select_option("#platformSelect", "小红书")
            time.sleep(3)
            page.screenshot(path=os.path.join(IMG_DIR, "08_xiaohongshu_filtered.png"), full_page=True)
            print("Screenshot saved: 08_xiaohongshu_filtered.png")
            
            route_items = page.query_selector_all(".route-item")
            print(f"Route items for 小红书: {len(route_items)}")
            
        except Exception as e:
            print(f"ERROR filtering by platform: {e}")
            issues.append({"type": "platform_filter_error", "details": str(e)})
        
        # Test 11: API endpoints test
        print("\n" + "=" * 60)
        print("TEST 11: Testing API endpoints")
        print("=" * 60)
        api_tests = {
            "/api/cities": "城市列表",
            "/api/platforms": "平台列表",
            "/api/routes": "路线数据",
            "/api/notes": "笔记数据",
            "/api/analysis": "分析数据",
            "/api/heatmap": "热力图数据",
            "/api/poi_colors": "POI颜色",
            "/api/routes/上海": "上海路线",
            "/api/routes/北京": "北京路线",
        }
        for endpoint, name in api_tests.items():
            try:
                response = page.evaluate(f"""fetch('{endpoint}').then(r => r.json()).then(d => JSON.stringify(d).slice(0, 200))""")
                print(f"  {name} ({endpoint}): OK")
            except Exception as e:
                print(f"  {name} ({endpoint}): FAILED - {e}")
                issues.append({"type": "api_error", "details": f"API {endpoint} failed: {e}"})
        
        # Final screenshot with all data
        print("\n" + "=" * 60)
        print("TEST 12: Final overview")
        print("=" * 60)
        try:
            page.select_option("#citySelect", "")
            page.select_option("#platformSelect", "")
            time.sleep(3)
            page.screenshot(path=os.path.join(IMG_DIR, "09_final_overview.png"), full_page=True)
            print("Screenshot saved: 09_final_overview.png")
        except Exception as e:
            print(f"ERROR in final overview: {e}")
        
        # Print all console errors
        if console_errors:
            print("\n" + "=" * 60)
            print("ALL CONSOLE ERRORS:")
            print("=" * 60)
            for err in console_errors:
                print(f"  {err}")
            issues.append({"type": "console_errors", "details": console_errors})
        
        browser.close()
        return issues

if __name__ == "__main__":
    issues = test_page()
    print("\n" + "=" * 60)
    print("SUMMARY OF ISSUES:")
    print("=" * 60)
    if issues:
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. [{issue['type']}] {issue['details']}")
    else:
        print("  No issues found!")
    
    # Save issues to JSON
    with open(os.path.join(IMG_DIR, "test_issues.json"), "w", encoding="utf-8") as f:
        json.dump({"issues": issues, "timestamp": time.time()}, f, ensure_ascii=False, indent=2)
