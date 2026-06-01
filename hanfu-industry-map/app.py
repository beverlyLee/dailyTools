from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from urllib.parse import unquote

from src.clustering.address_parser import load_merchants, get_merchants_with_coordinates, cluster_merchants_by_city
from src.matching.industry_belt import get_merchants_with_belt_info, get_all_industry_belts, get_top_merchants_by_city

load_dotenv()

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'merchants.json')


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/merchants', methods=['GET'])
def get_merchants():
    try:
        merchants = load_merchants(DATA_FILE)
        merchants_with_coord = get_merchants_with_coordinates(merchants)
        merchants_with_belt = get_merchants_with_belt_info(merchants_with_coord)
        return jsonify({
            "success": True,
            "data": merchants_with_belt,
            "total": len(merchants_with_belt)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"获取商家数据失败: {str(e)}"
        }), 500


@app.route('/api/merchants/cluster', methods=['GET'])
def get_clustered_merchants():
    try:
        merchants = load_merchants(DATA_FILE)
        clustered = cluster_merchants_by_city(merchants)
        result = []
        for city, merch_list in clustered.items():
            merch_with_belt = get_merchants_with_belt_info(merch_list)
            total_sales = sum(m['sales'] for m in merch_list)
            result.append({
                "city": city,
                "merchant_count": len(merch_list),
                "total_sales": total_sales,
                "merchants": merch_with_belt,
                "lng": merch_list[0]['lng'] if merch_list else 116.4074,
                "lat": merch_list[0]['lat'] if merch_list else 39.9042
            })
        return jsonify({
            "success": True,
            "data": result
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"获取聚类数据失败: {str(e)}"
        }), 500


@app.route('/api/industry-belts', methods=['GET'])
def get_industry_belts():
    try:
        belts = get_all_industry_belts()
        return jsonify({
            "success": True,
            "data": belts
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"获取产业带数据失败: {str(e)}"
        }), 500


@app.route('/api/merchants/top', methods=['GET'])
def get_top_merchants():
    try:
        city_encoded = request.args.get('city', '')
        city = unquote(city_encoded)
        top_n = int(request.args.get('top_n', 5))
        merchants = load_merchants(DATA_FILE)
        merchants_with_coord = get_merchants_with_coordinates(merchants)
        top_merchants = get_top_merchants_by_city(merchants_with_coord, city, top_n)
        return jsonify({
            "success": True,
            "city": city,
            "data": top_merchants
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"获取头部商家数据失败: {str(e)}"
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
