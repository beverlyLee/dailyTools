import os
import sys
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

from src.reviews.pet_comment_spider import PetCommentSpider
from src.nlp.policy_detector import PolicyDetector
from src.poi.pet_poi_aggregator import PetPOIAggregator


@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')


@app.route('/api/pois', methods=['GET'])
def get_pois():
    aggregator = PetPOIAggregator(
        amap_api_key=os.getenv('GAODE_WEB_API_KEY', '')
    )
    
    pois = aggregator.get_pet_friendly_pois(city="上海")
    aggregator.save_pois(pois)
    
    return jsonify({
        'success': True,
        'data': pois,
        'count': len(pois)
    })


@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    spider = PetCommentSpider()
    reviews = spider.get_mock_reviews()
    return jsonify({
        'success': True,
        'data': reviews,
        'count': len(reviews)
    })


@app.route('/api/analyze', methods=['GET'])
def analyze_reviews():
    spider = PetCommentSpider()
    detector = PolicyDetector()
    
    reviews = spider.get_mock_reviews()
    results = detector.aggregate_analysis(reviews)
    
    results_dict = {
        shop: detector.result_to_dict(result)
        for shop, result in results.items()
    }
    
    return jsonify({
        'success': True,
        'data': results_dict
    })


@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        'success': True,
        'data': {
            'gaode_js_api_key': os.getenv('GAODE_JS_API_KEY', '')
        }
    })


if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 宠物友好场所指南服务启动中...")
    print(f"📍 地址: http://{host}:{port}")
    print(f"🔧 调试模式: {debug}")
    
    app.run(host=host, port=port, debug=debug)
