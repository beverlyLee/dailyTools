import os
from dotenv import load_dotenv
from sanic import Sanic, response
from sanic.response import json, html, file
from sanic_cors import CORS

from src.poi.dianping_spider import DianpingSpider
from src.analysis.buffer_analysis import BufferAnalysis

load_dotenv()

app = Sanic("ScriptKillingMap")
CORS(app)

app.static("/static", "./static")

spider = DianpingSpider()
analyzer = BufferAnalysis()

@app.get("/")
async def index(request):
    return await file("./templates/index.html")

@app.get("/api/shops")
async def get_shops(request):
    city = request.args.get("city", "武汉")
    shops = spider.search_script_killing_shops(city)
    return json({
        "success": True,
        "data": shops,
        "total": len(shops)
    })

@app.get("/api/university-towns")
async def get_university_towns(request):
    city = request.args.get("city", "武汉")
    towns = spider.get_university_towns(city)
    return json({
        "success": True,
        "data": towns,
        "total": len(towns)
    })

@app.get("/api/cbd-areas")
async def get_cbd_areas(request):
    city = request.args.get("city", "武汉")
    cbds = spider.get_cbd_areas(city)
    return json({
        "success": True,
        "data": cbds,
        "total": len(cbds)
    })

@app.get("/api/analysis/university-town")
async def analyze_university_town(request):
    city = request.args.get("city", "武汉")
    radius = int(request.args.get("radius", 3000))
    
    shops = spider.search_script_killing_shops(city)
    university_towns = spider.get_university_towns(city)
    
    analysis = analyzer.analyze_university_town_buffer(shops, university_towns, radius)
    
    return json({
        "success": True,
        "data": analysis
    })

@app.get("/api/analysis/cbd")
async def analyze_cbd(request):
    city = request.args.get("city", "武汉")
    radius = int(request.args.get("radius", 2000))
    
    shops = spider.search_script_killing_shops(city)
    cbd_areas = spider.get_cbd_areas(city)
    
    analysis = analyzer.analyze_cbd_buffer(shops, cbd_areas, radius)
    
    return json({
        "success": True,
        "data": analysis
    })

@app.get("/api/analysis/tags")
async def analyze_tags(request):
    city = request.args.get("city", "武汉")
    
    shops = spider.search_script_killing_shops(city)
    analysis = analyzer.analyze_tag_distribution(shops)
    
    return json({
        "success": True,
        "data": analysis
    })

@app.get("/api/analysis/comprehensive")
async def analyze_comprehensive(request):
    city = request.args.get("city", "武汉")
    
    shops = spider.search_script_killing_shops(city)
    university_towns = spider.get_university_towns(city)
    cbd_areas = spider.get_cbd_areas(city)
    
    analysis = analyzer.generate_comprehensive_analysis(shops, university_towns, cbd_areas)
    
    return json({
        "success": True,
        "data": analysis
    })

@app.get("/api/shop/<shop_id>")
async def get_shop_detail(request, shop_id):
    city = request.args.get("city", "武汉")
    shops = spider.search_script_killing_shops(city)
    
    shop = next((s for s in shops if s["id"] == shop_id), None)
    
    if shop:
        return json({
            "success": True,
            "data": shop
        })
    else:
        return json({
            "success": False,
            "message": "Shop not found"
        }, status=404)

@app.get("/api/health")
async def health_check(request):
    return json({
        "success": True,
        "message": "Script Killing Map API is running",
        "version": "1.0.0"
    })

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting Script Killing Map server on {host}:{port}")
    print("Available endpoints:")
    print("  GET /              - Web interface")
    print("  GET /api/health   - Health check")
    print("  GET /api/shops    - List all script killing shops")
    print("  GET /api/university-towns - List university towns")
    print("  GET /api/cbd-areas - List CBD areas")
    print("  GET /api/analysis/university-town - University town analysis")
    print("  GET /api/analysis/cbd - CBD analysis")
    print("  GET /api/analysis/tags - Tag distribution analysis")
    print("  GET /api/analysis/comprehensive - Comprehensive analysis")
    print("  GET /api/shop/<id> - Shop detail")
    
    app.run(host=host, port=port, debug=True)
