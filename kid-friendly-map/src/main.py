import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sanic import Sanic
from sanic.response import json, file
from sanic_cors import CORS

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.scoring import FacilityScorer
from src.poi import ParentChildPoiAggregator

load_dotenv(project_root / ".env")

app = Sanic("KidFriendlyMap")
CORS(app)

frontend_dir = project_root / "frontend"
app.static("/static", str(frontend_dir))

scorer = FacilityScorer()
poi_aggregator = ParentChildPoiAggregator()
poi_aggregator.update_poi_scores(scorer)

DISNEYLAND_CENTER = (31.1416, 121.6570)


@app.route("/")
async def index(request):
    return await file(str(frontend_dir / "index.html"))


@app.route("/api/pois", methods=["GET"])
async def get_pois(request):
    try:
        lat = float(request.args.get("lat", DISNEYLAND_CENTER[0]))
        lng = float(request.args.get("lng", DISNEYLAND_CENTER[1]))
        radius = float(request.args.get("radius", 5000))
        poi_type = request.args.get("type")
        min_score = request.args.get("minScore")
        min_score_val = float(min_score) if min_score else None

        pois = poi_aggregator.filter_pois(
            center_lat=lat,
            center_lng=lng,
            radius=radius,
            poi_type=poi_type,
            min_score=min_score_val
        )

        result = [poi_aggregator.to_dict(poi) for poi in pois]

        return json({
            "code": 200,
            "message": "success",
            "data": result
        })
    except Exception as e:
        return json({
            "code": 500,
            "message": f"Error: {str(e)}",
            "data": []
        }, status=500)


@app.route("/api/poi/<poi_id>", methods=["GET"])
async def get_poi_detail(request, poi_id):
    try:
        poi = poi_aggregator.get_poi_by_id(poi_id)
        if not poi:
            return json({
                "code": 404,
                "message": "POI not found",
                "data": None
            }, status=404)

        detail = poi_aggregator.to_detail_dict(poi, scorer)
        return json({
            "code": 200,
            "message": "success",
            "data": detail
        })
    except Exception as e:
        return json({
            "code": 500,
            "message": f"Error: {str(e)}",
            "data": None
        }, status=500)


@app.route("/api/score/<poi_id>", methods=["GET"])
async def get_poi_score(request, poi_id):
    try:
        poi = poi_aggregator.get_poi_by_id(poi_id)
        if not poi:
            return json({
                "code": 404,
                "message": "POI not found",
                "data": None
            }, status=404)

        result = scorer.score_poi(poi.id, poi.reviews)
        return json({
            "code": 200,
            "message": "success",
            "data": scorer.to_dict(result)
        })
    except Exception as e:
        return json({
            "code": 500,
            "message": f"Error: {str(e)}",
            "data": None
        }, status=500)


@app.route("/api/config", methods=["GET"])
async def get_config(request):
    return json({
        "code": 200,
        "message": "success",
        "data": {
            "gaodeJsApiKey": os.getenv("GAODE_JS_API_KEY", ""),
            "defaultCenter": {
                "lat": DISNEYLAND_CENTER[0],
                "lng": DISNEYLAND_CENTER[1]
            },
            "scoreLevels": {
                "excellent": {"min": 9.0, "max": 10.0, "color": "#36D399", "label": "强烈推荐"},
                "good": {"min": 7.0, "max": 8.9, "color": "#A3E635", "label": "推荐"},
                "average": {"min": 5.0, "max": 6.9, "color": "#FBBF24", "label": "一般"},
                "poor": {"min": 0.0, "max": 4.9, "color": "#F87272", "label": "雷区"}
            },
            "poiTypes": [
                {"value": "mall", "label": "商场", "icon": "🏬"},
                {"value": "park", "label": "公园", "icon": "🌳"},
                {"value": "museum", "label": "博物馆", "icon": "🏛️"}
            ]
        }
    })


def find_available_port(start_port: int, max_tries: int = 10) -> int:
    import socket
    for i in range(max_tries):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(("0.0.0.0", port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"Could not find an available port after {max_tries} attempts")


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    start_port = int(os.getenv("PORT", 8000))
    
    try:
        port = find_available_port(start_port)
        if port != start_port:
            print(f"Port {start_port} is occupied, using port {port} instead")
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    print(f"========================================")
    print(f"  亲子出行地图 - 启动成功!")
    print(f"========================================")
    print(f"  🌐 访问地址: http://localhost:{port}")
    print(f"  📍 默认中心: 上海迪士尼 {DISNEYLAND_CENTER}")
    print(f"  📊 加载 POI: {len(poi_aggregator.pois)} 个")
    print(f"========================================")
    print()
    
    try:
        app.run(host=host, port=port, auto_reload=True, dev=True)
    except Exception as e:
        print(f"Server failed to start: {e}")
        sys.exit(1)
