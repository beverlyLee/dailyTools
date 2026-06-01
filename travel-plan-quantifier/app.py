import os
import re
from sanic import Sanic
from sanic.response import json, file
from sanic_cors import CORS
from dotenv import load_dotenv

from src.mining.poi_extractor import PoiExtractor
from src.routing.route_optimizer import RouteOptimizer
from src.ai.trip_polisher import TripPolisher

load_dotenv()

app = Sanic("TravelPlanQuantifier")
CORS(app)

app.static('/static', './static', name='static_files')

poi_extractor = PoiExtractor()
route_optimizer = RouteOptimizer()
trip_polisher = TripPolisher()

@app.route('/')
async def index(request):
    return await file('./static/index.html')

@app.route('/api/generate-plan', methods=['POST'])
async def generate_plan(request):
    try:
        data = request.json
        input_text = data.get('input', '')
        
        city, days = parse_input(input_text)
        
        poi_names = poi_extractor.get_city_pois(city, days)
        pois_with_location = poi_extractor.enrich_poi_with_location(poi_names, city)
        
        route_data = route_optimizer.optimize_route(pois_with_location, days)
        
        polished_data = trip_polisher.polish_trip(city, days, route_data)
        
        return json({
            'success': True,
            'data': {
                'city': city,
                'days': days,
                'route': route_data,
                'polished_trip': polished_data['polished_content']
            }
        })
        
    except Exception as e:
        return json({
            'success': False,
            'error': str(e)
        }, status=500)

@app.route('/api/extract-pois', methods=['POST'])
async def extract_pois(request):
    try:
        data = request.json
        text = data.get('text', '')
        city = data.get('city', None)
        
        extracted_pois = poi_extractor.extract_from_text(text, city)
        
        return json({
            'success': True,
            'data': extracted_pois
        })
        
    except Exception as e:
        return json({
            'success': False,
            'error': str(e)
        }, status=500)

@app.route('/api/optimize-route', methods=['POST'])
async def optimize_route(request):
    try:
        data = request.json
        pois = data.get('pois', [])
        days = data.get('days', 3)
        
        route_data = route_optimizer.optimize_route(pois, days)
        
        return json({
            'success': True,
            'data': route_data
        })
        
    except Exception as e:
        return json({
            'success': False,
            'error': str(e)
        }, status=500)

@app.route('/api/polish-trip', methods=['POST'])
async def polish_trip(request):
    try:
        data = request.json
        city = data.get('city', '北京')
        days = data.get('days', 3)
        route_data = data.get('route', {})
        
        polished_data = trip_polisher.polish_trip(city, days, route_data)
        
        return json({
            'success': True,
            'data': polished_data
        })
        
    except Exception as e:
        return json({
            'success': False,
            'error': str(e)
        }, status=500)

def parse_input(input_text: str):
    city_match = re.search(r'([北京上海广州深圳杭州西安成都重庆南京苏州武汉]+)', input_text)
    city = city_match.group(1) if city_match else '北京'
    
    days_match = re.search(r'(\d+)\s*天', input_text)
    days = int(days_match.group(1)) if days_match else 3
    
    return city, days

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
