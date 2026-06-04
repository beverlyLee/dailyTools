import asyncio
import json
import os
from sanic import Sanic, response
from sanic.response import json as json_response
from sanic_cors import CORS
from dotenv import load_dotenv

from discovery.camping_note_spider import CampingNoteSpider
from weather.geo_coder import GeoCoder
from weather.historical_weather import HistoricalWeather
from scoring.comfort_index import ComfortIndex

load_dotenv()

app = Sanic("CampingWindGrass")
CORS(app)

app.static("/", "/Users/liboyang/trae/dailyTools/camping-wind-grass/frontend/dist", name="frontend")

spider = CampingNoteSpider()
geo_coder = GeoCoder()
weather_service = HistoricalWeather()
comfort_scorer = ComfortIndex()

camping_sites_cache = {}
processed_sites = []


@app.route("/api/sites", methods=["GET"])
async def get_camping_sites(request):
    global processed_sites

    if not processed_sites:
        await process_camping_sites()

    return json_response({
        "success": True,
        "data": processed_sites,
        "total": len(processed_sites),
    })


@app.route("/api/site/<site_id>", methods=["GET"])
async def get_site_detail(request, site_id):
    global processed_sites

    if not processed_sites:
        await process_camping_sites()

    for site in processed_sites:
        if site.get("id") == site_id:
            return json_response({
                "success": True,
                "data": site,
            })

    return json_response({
        "success": False,
        "message": "Site not found",
    }, status=404)


@app.route("/api/sites/refresh", methods=["POST"])
async def refresh_sites(request):
    global processed_sites

    try:
        processed_sites = []
        await process_camping_sites(use_cache=False)
        return json_response({
            "success": True,
            "message": "Data refreshed successfully",
            "total": len(processed_sites),
        })
    except Exception as e:
        return json_response({
            "success": False,
            "message": str(e),
        }, status=500)


@app.route("/api/config", methods=["GET"])
async def get_config(request):
    return json_response({
        "success": True,
        "data": {
            "gaode_api_key": os.getenv("GAODE_API_KEY", ""),
            "map_provider": "gaode",
        },
    })


@app.route("/api/stats", methods=["GET"])
async def get_stats(request):
    global processed_sites

    if not processed_sites:
        await process_camping_sites()

    grade_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}
    avg_score = 0

    for site in processed_sites:
        grade = site.get("comfort", {}).get("grade", "C")
        grade_counts[grade] = grade_counts.get(grade, 0) + 1
        avg_score += site.get("comfort", {}).get("total_score", 0)

    avg_score = avg_score / len(processed_sites) if processed_sites else 0

    return json_response({
        "success": True,
        "data": {
            "total_sites": len(processed_sites),
            "grade_distribution": grade_counts,
            "average_score": round(avg_score, 1),
        },
    })


async def process_camping_sites(use_cache: bool = True):
    global processed_sites

    cache_file = "/Users/liboyang/trae/dailyTools/camping-wind-grass/data/processed_sites.json"

    if use_cache and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                processed_sites = json.load(f)
                print(f"加载缓存数据: {len(processed_sites)} 个露营地")
                return
        except:
            pass

    raw_sites = spider.load_mock_data()
    processed = []

    for idx, site in enumerate(raw_sites):
        site_id = f"site_{idx + 1}"

        lng, lat = await geo_coder.geocode(site["location"])

        weather_data = await weather_service.get_historical_weather(lng, lat)

        comfort_data = comfort_scorer.calculate_score(
            weather_data, site.get("keywords", [])
        )

        processed_site = {
            "id": site_id,
            "name": site["name"],
            "location": site["location"],
            "description": site["description"],
            "lng": lng,
            "lat": lat,
            "photos": site["photos"],
            "keywords": site["keywords"],
            "source": site["source"],
            "weather": {
                "avg_wind_speed": weather_data.get("avg_wind_speed"),
                "wind_level": weather_data.get("wind_level"),
                "wind_level_desc": weather_data.get("wind_level_desc"),
                "rain_probability": weather_data.get("rain_probability"),
                "rain_days": weather_data.get("rain_days"),
                "grass_coverage": weather_data.get("grass_coverage"),
                "avg_temperature": weather_data.get("avg_temperature"),
                "wind_distribution": weather_data.get("wind_distribution"),
                "monthly_data": weather_data.get("monthly_data"),
            },
            "comfort": comfort_data,
        }

        processed.append(processed_site)
        print(f"处理完成: {site['name']} - 评分: {comfort_data['total_score']}")

    processed_sites = processed

    os.makedirs(os.path.dirname(cache_file), exist_ok=True)
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(processed_sites, f, ensure_ascii=False, indent=2)

    print(f"共处理 {len(processed_sites)} 个露营地")


@app.listener("before_server_start")
async def setup(app, loop):
    await process_camping_sites()


@app.route("/")
async def index(request):
    return await response.file(
        "/Users/liboyang/trae/dailyTools/camping-wind-grass/frontend/dist/index.html"
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 露营地舒适度评估系统启动中...")
    print(f"📊 服务地址: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
