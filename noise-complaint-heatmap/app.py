from flask import Flask, render_template, jsonify, send_from_directory, request
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.crawlers.gov_complaint_spider import GovComplaintSpider
from src.parser.address_resolver import AddressResolver
from src.parser.noise_classifier import NoiseClassifier
from src.visualization.heatmap_generator import HeatmapGenerator

load_dotenv()

app = Flask(__name__, 
            static_folder='frontend',
            template_folder='frontend')

spider = GovComplaintSpider()
resolver = AddressResolver()
classifier = NoiseClassifier()
heatmap_generator = HeatmapGenerator()

_complaints_data = None


def get_processed_data(force_refresh=False, count: int = 1000):
    global _complaints_data
    if _complaints_data is None or force_refresh:
        complaints = spider.generate_large_mock_data(count)
        complaints = classifier.batch_classify(complaints)
        _complaints_data = complaints
    return _complaints_data


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/leaflet-heat-custom.js')
def leaflet_heat_js():
    return send_from_directory('frontend', 'leaflet-heat-custom.js')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory('frontend', 'favicon.svg', mimetype='image/svg+xml')


@app.route('/api/complaints')
def get_complaints():
    category = request.args.get('category', None)
    complaints = get_processed_data()
    
    filtered = complaints
    if category:
        filtered = [c for c in complaints if c.get('category') == category]
    
    return jsonify({
        'success': True,
        'count': len(filtered),
        'data': filtered
    })


@app.route('/api/categories')
def get_categories():
    categories = classifier.get_all_categories()
    return jsonify({
        'success': True,
        'data': categories
    })


@app.route('/api/heatmap-data')
def get_heatmap_data():
    category = request.args.get('category', None)
    complaints = get_processed_data()
    
    heatmap_data = heatmap_generator.get_points_by_category(complaints)
    
    if category:
        return jsonify({
            'success': True,
            'category': category,
            'data': heatmap_data.get(category, [])
        })
    
    return jsonify({
        'success': True,
        'data': heatmap_data
    })


@app.route('/api/stats')
def get_stats():
    complaints = get_processed_data()
    
    category_stats = {}
    for c in complaints:
        cat = c.get('category', 'unknown')
        if cat not in category_stats:
            category_stats[cat] = 0
        category_stats[cat] += 1
    
    resolved_count = sum(1 for c in complaints if c.get('resolved'))
    
    return jsonify({
        'success': True,
        'total': len(complaints),
        'resolved': resolved_count,
        'by_category': category_stats
    })


@app.route('/api/refresh')
def refresh_data():
    get_processed_data(force_refresh=True)
    return jsonify({'success': True, 'message': '数据已刷新'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
