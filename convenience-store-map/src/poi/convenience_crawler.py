import asyncio
import json
import os
import math

import httpx
from dotenv import load_dotenv

from src.config import DATA_DIR, ensure_data_dir, get_data_path

load_dotenv()

GAODE_KEY = os.getenv("GAODE_WEB_SERVICE_KEY", "")
PLACE_SEARCH_URL = "https://restapi.amap.com/v3/place/text"

BRAND_KEYWORDS = ["罗森", "全家", "7-Eleven", "711", "7-11", "便利", "快客", "可的", "好德", "良友"]

CONVENIENCE_TYPE = "050400"


def generate_grid(bounds: dict, step_meters: float = 500.0) -> list[dict]:
    sw_lng = bounds["sw_lng"]
    sw_lat = bounds["sw_lat"]
    ne_lng = bounds["ne_lng"]
    ne_lat = bounds["ne_lat"]

    lng_step = step_meters / 111320.0 * math.cos(math.radians((sw_lat + ne_lat) / 2))
    lat_step = step_meters / 110540.0

    grids = []
    lat = sw_lat
    while lat < ne_lat:
        lng = sw_lng
        while lng < ne_lng:
            grids.append({
                "sw_lng": round(lng, 6),
                "sw_lat": round(lat, 6),
                "ne_lng": round(lng + lng_step, 6),
                "ne_lat": round(lat + lat_step, 6),
                "center_lng": round(lng + lng_step / 2, 6),
                "center_lat": round(lat + lat_step / 2, 6),
            })
            lng += lng_step
        lat += lat_step
    return grids


def extract_brand(name: str) -> str:
    name_upper = name.upper()
    brand_map = {
        "罗森": "罗森",
        "全家": "全家",
        "7-ELEVEN": "7-Eleven",
        "7ELEVEN": "7-Eleven",
        "7-11": "7-Eleven",
        "711": "7-Eleven",
        "快客": "快客",
        "可的": "可的",
        "好德": "好德",
        "良友": "良友",
        "便利": "其他便利店",
    }
    for keyword, brand in brand_map.items():
        if keyword in name_upper:
            return brand
    return "其他便利店"


async def _search_page(client: httpx.AsyncClient, params: dict, page: int) -> tuple[list[dict], dict | None]:
    p = {**params, "offset": page * 25, "page": page}
    try:
        resp = await client.get(PLACE_SEARCH_URL, params=p, timeout=10.0)
        data = resp.json()
        if data.get("status") != "1":
            error_info = {
                "status_code": data.get("status"),
                "message": data.get("info", "未知错误"),
                "http_status": resp.status_code,
            }
            return [], error_info
        pois = data.get("pois", [])
        results = []
        for poi in pois:
            location = poi.get("location", "")
            if not location:
                continue
            lng, lat = location.split(",")
            results.append({
                "name": poi.get("name", ""),
                "brand": extract_brand(poi.get("name", "")),
                "lng": float(lng),
                "lat": float(lat),
                "address": poi.get("address", ""),
                "adcode": poi.get("adcode", ""),
            })
        return results, None
    except Exception as e:
        error_info = {
            "status_code": None,
            "message": str(e),
            "http_status": None,
            "error_type": type(e).__name__,
        }
        return [], error_info


async def crawl_grid_cell(
    client: httpx.AsyncClient, grid_cell: dict, keywords: str
) -> tuple[list[dict], dict | None]:
    polygon = f"{grid_cell['sw_lng']},{grid_cell['sw_lat']},{grid_cell['ne_lng']},{grid_cell['ne_lat']}"
    params = {
        "key": GAODE_KEY,
        "keywords": keywords,
        "types": CONVENIENCE_TYPE,
        "polygon": polygon,
        "offset": 25,
        "page": 1,
        "output": "JSON",
    }

    if not GAODE_KEY or GAODE_KEY == "your_gaode_api_key_here":
        return [], {
            "status_code": None,
            "message": "未配置 GAODE_WEB_SERVICE_KEY，请在 .env 文件中设置有效的 API Key",
            "http_status": None,
            "error_type": "MissingApiKey",
        }

    try:
        resp = await client.get(PLACE_SEARCH_URL, params=params, timeout=10.0)
        data = resp.json()
        if data.get("status") != "1":
            error_info = {
                "status_code": data.get("status"),
                "message": data.get("info", "API 返回错误"),
                "http_status": resp.status_code,
            }
            return [], error_info
        total = int(data.get("count", 0))
        pois = data.get("pois", [])

        all_results = []
        for poi in pois:
            location = poi.get("location", "")
            if not location:
                continue
            lng, lat = location.split(",")
            all_results.append({
                "name": poi.get("name", ""),
                "brand": extract_brand(poi.get("name", "")),
                "lng": float(lng),
                "lat": float(lat),
                "address": poi.get("address", ""),
                "adcode": poi.get("adcode", ""),
            })

        total_pages = min(math.ceil(total / 25), 4)
        if total_pages > 1:
            tasks = [_search_page(client, params, p) for p in range(2, total_pages + 1)]
            pages = await asyncio.gather(*tasks)
            for page_results, error in pages:
                all_results.extend(page_results)

        return all_results, None
    except Exception as e:
        error_info = {
            "status_code": None,
            "message": str(e),
            "http_status": None,
            "error_type": type(e).__name__,
        }
        return [], error_info


async def crawl_city(
    city_bounds: dict,
    grid_step: float = 500.0,
    keywords: str = "便利店",
    concurrency: int = 5,
) -> dict:
    grids = generate_grid(city_bounds, grid_step)
    print(f"Generated {len(grids)} grid cells for crawling")

    ensure_data_dir()

    seen = set()
    all_pois = []
    all_errors = []
    empty_grid_count = 0
    failed_grid_count = 0
    semaphore = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient() as client:
        async def _crawl_one(cell: dict):
            async with semaphore:
                await asyncio.sleep(0.12)
                return await crawl_grid_cell(client, cell, keywords)

        batch_size = 50
        for i in range(0, len(grids), batch_size):
            batch = grids[i : i + batch_size]
            tasks = [_crawl_one(cell) for cell in batch]
            results = await asyncio.gather(*tasks)
            for pois, error in results:
                if error:
                    all_errors.append(error)
                    failed_grid_count += 1
                elif len(pois) == 0:
                    empty_grid_count += 1
                for poi in pois:
                    key = (poi["lng"], poi["lat"], poi["name"])
                    if key not in seen:
                        seen.add(key)
                        all_pois.append(poi)
            print(f"Batch {i // batch_size + 1}: total unique POIs = {len(all_pois)}, errors = {len(all_errors)}")

    output_path = get_data_path("convenience_pois.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_pois, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(all_pois)} POIs to {output_path}")

    error_summary = None
    if all_errors:
        error_types: dict[str, int] = {}
        for err in all_errors:
            t = err.get("message", "未知错误")
            error_types[t] = error_types.get(t, 0) + 1
        error_summary = {
            "total_errors": len(all_errors),
            "failed_grids": failed_grid_count,
            "empty_grids": empty_grid_count,
            "success_grids": len(grids) - failed_grid_count - empty_grid_count,
            "error_types": error_types,
            "first_error": all_errors[0] if all_errors else None,
        }

    return {
        "pois": all_pois,
        "pois_count": len(all_pois),
        "grid_count": len(grids),
        "empty_grid_count": empty_grid_count,
        "failed_grid_count": failed_grid_count,
        "success_grid_count": len(grids) - failed_grid_count - empty_grid_count,
        "errors": all_errors,
        "error_summary": error_summary,
    }


def load_pois() -> list[dict]:
    path = get_data_path("convenience_pois.json")
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


SHANGHAI_INNER = {
    "sw_lng": 121.40,
    "sw_lat": 31.17,
    "ne_lng": 121.51,
    "ne_lat": 31.28,
}

SHANGHAI_FULL = {
    "sw_lng": 121.00,
    "sw_lat": 30.70,
    "ne_lng": 121.90,
    "ne_lat": 31.50,
}


async def run_crawl(bounds: dict | None = None, grid_step: float = 500.0):
    if bounds is None:
        bounds = SHANGHAI_FULL
    return await crawl_city(bounds, grid_step)


if __name__ == "__main__":
    asyncio.run(run_crawl())
