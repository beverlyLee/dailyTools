from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from analytics.brand_pyramid import BrandPyramid
from crawler.social_data_collector import SocialDataCollector

load_dotenv()

app = Flask(__name__)
CORS(app)

brand_pyramid = BrandPyramid()
social_collector = SocialDataCollector()

def get_data_source_param():
    """从请求中获取数据源参数"""
    # 优先从查询参数获取
    source = request.args.get('source')
    if source and brand_pyramid.is_valid_data_source(source):
        return source
    # 从请求头获取
    source = request.headers.get('X-Data-Source')
    if source and brand_pyramid.is_valid_data_source(source):
        return source
    # 默认值
    return 'industry_report_2024'

@app.route('/')
def index():
    return jsonify({
        "message": "宠物消费洞察分析平台 API",
        "version": "3.0.0",
        "features": ["无状态多数据源支持", "消费结构分析", "品牌趋势对比", "每个请求独立指定数据源"],
        "default_data_source": "industry_report_2024"
    })

@app.route('/api/consumption-structure')
def get_consumption_structure():
    data_source = get_data_source_param()
    data = brand_pyramid.get_consumption_structure(data_source)
    return jsonify(data)

@app.route('/api/brand-trends')
def get_brand_trends():
    data_source = get_data_source_param()
    data = brand_pyramid.get_brand_trends(data_source)
    return jsonify(data)

@app.route('/api/category-share')
def get_category_share():
    data_source = get_data_source_param()
    data = brand_pyramid.get_category_share(data_source)
    return jsonify(data)

@app.route('/api/data-sources', methods=['GET'])
def get_data_sources():
    current_source = get_data_source_param()
    return jsonify({
        "current": brand_pyramid.get_data_source_info(current_source),
        "available": brand_pyramid.get_all_data_sources()
    })

@app.route('/api/social-posts', methods=['GET'])
def get_social_posts():
    platform = request.args.get('platform', 'all')
    count = int(request.args.get('count', 10))
    data_source = request.args.get('source', 'social_douyin')
    
    posts = social_collector.get_social_posts(platform=platform, count=count)
    return jsonify({
        "count": len(posts),
        "platform": platform,
        "posts": posts,
        "data_source": data_source,
        "data_source_info": social_collector.get_data_source_info(platform)
    })

@app.route('/api/social-trends', methods=['GET'])
def get_social_trends():
    platform = request.args.get('platform', 'all')
    data_source = request.args.get('source', 'social_douyin')
    
    trends = social_collector.get_social_trends(platform=platform)
    return jsonify({
        **trends,
        "data_source": data_source
    })

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 8003))
    print(f"🚀 宠物消费洞察分析平台 API v3.0.0 启动")
    print(f"📍 监听端口: {port}")
    print(f"📊 支持数据源数量: {len(brand_pyramid.get_all_data_sources())}")
    print(f"🔍 支持的数据源:")
    for ds in brand_pyramid.get_all_data_sources():
        print(f"   - {ds['name']} ({ds['id']})")
    print(f"💡 使用方式: 在请求URL后添加 ?source=数据源ID")
    app.run(host='0.0.0.0', port=port, debug=True)
