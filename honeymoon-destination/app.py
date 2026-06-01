import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import List, Dict, Optional
from dotenv import load_dotenv
from src.data.travel_package import (
    generate_packages,
    aggregate_by_route,
    get_province_data,
    get_destination_data,
    REGION_PREFERENCES,
    get_region
)
from src.geo.flight_path import (
    process_routes_for_deckgl,
    add_colors_to_routes,
    haversine_distance
)

load_dotenv()

GAODE_API_KEY = os.getenv('GAODE_API_KEY', '')

app = FastAPI(title="蜜月目的地分析 API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dist_assets = os.path.join(BASE_DIR, "frontend", "dist", "assets")
if os.path.exists(dist_assets):
    app.mount("/assets", StaticFiles(directory=dist_assets), name="assets")
else:
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    src_path = os.path.join(frontend_dir, "src")
    if os.path.exists(src_path):
        app.mount("/src", StaticFiles(directory=src_path), name="src")

packages = generate_packages(3000)
routes = aggregate_by_route(packages)
province_region_map = {}
for region, provinces in REGION_PREFERENCES.items():
    for p in provinces:
        province_region_map[p] = region
deckgl_routes = process_routes_for_deckgl(routes)
deckgl_routes = add_colors_to_routes(deckgl_routes, province_region_map)

@app.get("/api/routes")
async def get_routes(
    region: Optional[str] = Query(None, description="筛选地区：长三角/珠三角/环渤海/中西部"),
    min_income: Optional[int] = Query(None, description="最低人均可支配收入"),
    max_income: Optional[int] = Query(None, description="最高人均可支配收入"),
    min_cost: Optional[float] = Query(None, description="最低平均花费"),
    max_cost: Optional[float] = Query(None, description="最高平均花费")
):
    filtered = deckgl_routes
    
    if region:
        filtered = [r for r in filtered if province_region_map.get(r['from']['name'], '其他') == region]
    
    if min_income:
        filtered = [r for r in filtered if r['income'] >= min_income]
    if max_income:
        filtered = [r for r in filtered if r['income'] <= max_income]
    
    if min_cost:
        filtered = [r for r in filtered if r['avgCost'] >= min_cost]
    if max_cost:
        filtered = [r for r in filtered if r['avgCost'] <= max_cost]
    
    return filtered

@app.get("/api/provinces")
async def get_provinces():
    provinces = get_province_data()
    result = []
    for name, data in provinces.items():
        result.append({
            'name': name,
            'coord': data['coord'],
            'income': data['income'],
            'region': get_region(name)
        })
    return result

@app.get("/api/destinations")
async def get_destinations():
    destinations = get_destination_data()
    result = []
    for name, data in destinations.items():
        result.append({
            'name': name,
            'coord': data['coord'],
            'cost': data['cost'],
            'tier': data['tier']
        })
    return result

@app.get("/api/statistics")
async def get_statistics():
    total_packages = len(packages)
    total_routes = len(routes)
    avg_cost = sum(p.cost for p in packages) / total_packages
    
    region_stats = {}
    for region in REGION_PREFERENCES.keys():
        region_packages = [p for p in packages if get_region(p.origin_province) == region]
        if region_packages:
            region_stats[region] = {
                'count': len(region_packages),
                'avgCost': sum(p.cost for p in region_packages) / len(region_packages),
                'topDestinations': get_top_destinations(region_packages, 5)
            }
    
    return {
        'totalPackages': total_packages,
        'totalRoutes': total_routes,
        'avgCost': round(avg_cost, 2),
        'regionStats': region_stats
    }

def get_top_destinations(package_list, top_n=5):
    dest_count = {}
    for p in package_list:
        dest_count[p.destination] = dest_count.get(p.destination, 0) + 1
    sorted_dest = sorted(dest_count.items(), key=lambda x: x[1], reverse=True)[:top_n]
    return [{'destination': d[0], 'count': d[1]} for d in sorted_dest]

@app.get("/api/config")
async def get_config():
    return {
        "gaodeApiKey": GAODE_API_KEY
    }

@app.get("/", response_class=HTMLResponse)
async def root():
    dist_index = os.path.join(os.path.dirname(__file__), "frontend", "dist", "index.html")
    if os.path.exists(dist_index):
        with open(dist_index, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('%GAODE_API_KEY%', GAODE_API_KEY)
        return content
    
    dev_index = os.path.join(os.path.dirname(__file__), "frontend", "index.html")
    if os.path.exists(dev_index):
        with open(dev_index, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('%GAODE_API_KEY%', GAODE_API_KEY)
        return content
    return "<h1>蜜月目的地可视化系统</h1><p>前端文件未找到</p>"

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("HONEYMOON_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
