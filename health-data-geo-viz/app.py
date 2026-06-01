#!/usr/bin/env python3
from flask import Flask, render_template, jsonify, send_from_directory
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetcher import NHCCrawler
from geo import GeoCoder
from charts import FluHeatmap

app = Flask(__name__)
app.config['OUTPUT_FOLDER'] = 'output'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'latest_data.json')


def get_latest_data():
    crawler = NHCCrawler()
    geo_coder = GeoCoder()
    
    if os.path.exists(DATA_FILE):
        print(f"加载缓存数据: {DATA_FILE}")
        raw_data = crawler.load_from_json(DATA_FILE)
    else:
        print("从卫健委官网获取数据...")
        raw_data = crawler.fetch_flu_data()
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        crawler.save_to_json(raw_data, DATA_FILE)
    
    geo_data = geo_coder.batch_geo_code(raw_data)
    return geo_data


def generate_charts():
    data = get_latest_data()
    heatmap = FluHeatmap(os.path.join(BASE_DIR, 'output'))
    
    heatmap.create_province_heatmap(
        data,
        title="中国各省份流感样病例百分比",
        subtitle="数据来源：国家卫生健康委员会",
        output_file="flu_heatmap.html"
    )
    
    heatmap.create_geo_scatter(
        data,
        title="中国各省份流感病例分布",
        output_file="flu_scatter.html"
    )
    
    return data


@app.route('/')
def index():
    data = generate_charts()
    return render_template('index.html', data=data)


@app.route('/charts/<filename>')
def serve_chart(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)


@app.route('/api/data')
def api_data():
    data = get_latest_data()
    return jsonify(data)


@app.route('/api/refresh')
def api_refresh():
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)
    data = get_latest_data()
    return jsonify({"status": "success", "data": data})


if __name__ == '__main__':
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
    print("=" * 60)
    print("疫情时空分析系统 - Web服务启动")
    print("=" * 60)
    print("\n访问地址: http://localhost:8000")
    print("按 Ctrl+C 停止服务\n")
    app.run(host='0.0.0.0', port=8000, debug=True)
