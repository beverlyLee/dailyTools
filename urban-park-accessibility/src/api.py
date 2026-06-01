import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from isochrone.walking_catchment import wc
from network.osm_loader import loader
from database import db

app = Flask(__name__)
CORS(app)

DEFAULT_PORT = 5000

@app.route('/')
def index():
    return send_from_directory('../static', 'index.html')

@app.route('/api/isochrone', methods=['POST'])
def calculate_isochrone():
    data = request.json
    lon = data.get('lon')
    lat = data.get('lat')
    travel_time = data.get('travel_time', 10)
    
    if not lon or not lat:
        return jsonify({'error': 'lon and lat are required'}), 400
    
    result = wc.calculate_isochrone(lon, lat, travel_time)
    return jsonify(result)

@app.route('/api/coverage', methods=['GET'])
def get_coverage():
    result = wc.calculate_coverage_ratio()
    return jsonify(result)

@app.route('/api/parks', methods=['GET'])
def get_parks():
    result = wc.get_parks_geojson()
    return jsonify(result)

@app.route('/api/residential', methods=['GET'])
def get_residential():
    result = wc.get_residential_geojson()
    return jsonify(result)

@app.route('/api/isochrones', methods=['GET'])
def get_isochrones():
    result = wc.get_all_isochrones()
    return jsonify(result)

@app.route('/api/deserts', methods=['GET'])
def get_deserts():
    result = wc.get_all_park_deserts()
    return jsonify(result)

@app.route('/api/load-data', methods=['POST'])
def load_data():
    data = request.json
    bbox = data.get('bbox', '22.53,113.92,22.57,113.96')
    
    try:
        result = loader.load_sample_data_shenzhen()
        return jsonify({
            'status': 'success',
            'message': f'数据加载成功: {result["parks"]} 个公园, {result["residential"]} 个居住区',
            'data': result
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    coverage = wc.calculate_coverage_ratio()
    deserts = wc.get_all_park_deserts()
    
    return jsonify({
        'coverage': coverage,
        'park_deserts_count': len(deserts)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    summary = db.get_data_summary()
    return jsonify({
        'status': 'healthy',
        'message': '城市公园可达性分析 API 运行正常',
        'data': summary
    })

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../static', path)

def get_port():
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('FLASK_PORT='):
                    return int(line.split('=')[1])
    
    port = os.environ.get('FLASK_PORT') or os.environ.get('PORT') or DEFAULT_PORT
    return int(port)

if __name__ == '__main__':
    port = get_port()
    print("=" * 50)
    print("🏞️  城市公园可达性分析系统")
    print("=" * 50)
    print(f"📝 服务地址: http://localhost:{port}")
    print(f"🌐 访问地址: http://127.0.0.1:{port}")
    print(f"💾 数据: {len(db.parks)} 个公园, {len(db.residential_areas)} 个居住区")
    print("=" * 50)
    print()
    app.run(host='0.0.0.0', port=port, debug=True)
