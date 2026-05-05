#!/usr/bin/env python3
"""
新闻舆情监控子系统
7x24小时监控财经媒体和社交平台，基于情感分析判断利好/利空，自动生成舆情热度榜
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import logging

from src.config import config
from src.monitoring_engine import monitoring_engine
from src.sentiment_analyzer import analyzer
from src.hot_topics_calculator import hot_topics_calculator
from src.news_crawler import crawler

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({
        'name': '新闻舆情监控子系统',
        'version': '1.0.0',
        'description': '7x24小时监控财经媒体和社交平台，基于情感分析判断利好/利空，自动生成舆情热度榜',
        'endpoints': {
            'monitoring': '/api/monitoring',
            'news': '/api/news',
            'sentiment': '/api/sentiment',
            'hot-topics': '/api/hot-topics'
        }
    })

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'monitoring_status': monitoring_engine.get_status()
    })

@app.route('/api/monitoring/status', methods=['GET'])
def get_monitoring_status():
    status = monitoring_engine.get_status()
    return jsonify(status)

@app.route('/api/monitoring/start', methods=['POST'])
def start_monitoring():
    success = monitoring_engine.start()
    return jsonify({
        'success': success,
        'message': '监控已启动' if success else '监控已在运行中',
        'status': monitoring_engine.get_status()
    })

@app.route('/api/monitoring/stop', methods=['POST'])
def stop_monitoring():
    success = monitoring_engine.stop()
    return jsonify({
        'success': success,
        'message': '监控已停止' if success else '监控未在运行中',
        'status': monitoring_engine.get_status()
    })

@app.route('/api/monitoring/crawl', methods=['POST'])
def manual_crawl():
    data = request.get_json() or {}
    source_name = data.get('source')
    
    news_items = monitoring_engine.manual_crawl(source_name)
    
    return jsonify({
        'success': True,
        'count': len(news_items),
        'news': news_items[:10]
    })

@app.route('/api/news', methods=['GET'])
def get_news():
    limit = request.args.get('limit', 100, type=int)
    sentiment = request.args.get('sentiment')
    source = request.args.get('source')
    
    news = monitoring_engine.get_recent_news(
        limit=limit,
        sentiment=sentiment,
        source=source
    )
    
    return jsonify(news)

@app.route('/api/news/<news_id>', methods=['GET'])
def get_news_detail(news_id):
    news_buffer = monitoring_engine.news_buffer
    for news in news_buffer:
        if news.get('id') == news_id or str(news.get('title', '')).find(news_id) >= 0:
            return jsonify(news)
    
    return jsonify({'error': '新闻不存在'}), 404

@app.route('/api/sentiment/trend', methods=['GET'])
def get_sentiment_trend():
    hours = request.args.get('hours', 24, type=int)
    
    trend = monitoring_engine.get_sentiment_trend(hours=hours)
    
    return jsonify(trend)

@app.route('/api/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': '请提供要分析的文本'}), 400
    
    text = data['text']
    result = analyzer.analyze(text)
    
    return jsonify(result)

@app.route('/api/sentiment/batch', methods=['POST'])
def batch_analyze():
    data = request.get_json()
    
    if not data or 'texts' not in data:
        return jsonify({'error': '请提供要分析的文本列表'}), 400
    
    texts = data['texts']
    results = analyzer.batch_analyze(texts)
    
    return jsonify(results)

@app.route('/api/hot-topics', methods=['GET'])
def get_hot_topics():
    top_n = request.args.get('top_n', 20, type=int)
    hours = request.args.get('hours', 24, type=int)
    
    news_buffer = monitoring_engine.news_buffer
    
    if news_buffer:
        hot_topics = hot_topics_calculator.get_trending_topics(
            news_buffer,
            hours=hours,
            top_n=top_n
        )
    else:
        hot_topics = [
            {'topic': 'AI概念', 'heat': 95, 'mentions': 12500, 'sentiment': 'positive'},
            {'topic': '新能源', 'heat': 85, 'mentions': 9800, 'sentiment': 'positive'},
            {'topic': '半导体', 'heat': 75, 'mentions': 8200, 'sentiment': 'neutral'},
            {'topic': '消费电子', 'heat': 65, 'mentions': 6500, 'sentiment': 'neutral'},
            {'topic': '医药生物', 'heat': 60, 'mentions': 5800, 'sentiment': 'negative'},
            {'topic': '金融科技', 'heat': 55, 'mentions': 5200, 'sentiment': 'positive'},
            {'topic': '房地产', 'heat': 50, 'mentions': 4500, 'sentiment': 'negative'},
            {'topic': '军工', 'heat': 45, 'mentions': 3800, 'sentiment': 'neutral'}
        ][:top_n]
    
    return jsonify(hot_topics)

@app.route('/api/hot-topics/<topic>/evolution', methods=['GET'])
def get_topic_evolution(topic):
    interval_hours = request.args.get('interval', 1, type=int)
    
    news_buffer = monitoring_engine.news_buffer
    
    if news_buffer:
        evolution = hot_topics_calculator.get_topic_evolution(
            news_buffer,
            topic,
            interval_hours=interval_hours
        )
    else:
        evolution = []
    
    return jsonify(evolution)

@app.route('/api/sources', methods=['GET'])
def get_sources():
    sources_info = []
    for source in config.NEWS_SOURCES:
        status = monitoring_engine.status['sources'].get(source['name'], {})
        sources_info.append({
            'name': source['name'],
            'url': source['url'],
            'type': source['type'],
            'enabled': source.get('enabled', True),
            'interval': source.get('interval', 300),
            'last_crawl': status.get('last_crawl'),
            'news_count': status.get('news_count', 0)
        })
    
    return jsonify(sources_info)

@app.route('/api/sources/<source_name>/enable', methods=['POST'])
def enable_source(source_name):
    for source in config.NEWS_SOURCES:
        if source['name'] == source_name:
            source['enabled'] = True
            return jsonify({'success': True, 'message': f'{source_name} 已启用'})
    
    return jsonify({'error': '数据源不存在'}), 404

@app.route('/api/sources/<source_name>/disable', methods=['POST'])
def disable_source(source_name):
    for source in config.NEWS_SOURCES:
        if source['name'] == source_name:
            source['enabled'] = False
            return jsonify({'success': True, 'message': f'{source_name} 已禁用'})
    
    return jsonify({'error': '数据源不存在'}), 404

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    status = monitoring_engine.get_status()
    
    return jsonify({
        'total_news': status.get('news_count', 0),
        'positive_news': status.get('positive_count', 0),
        'negative_news': status.get('negative_count', 0),
        'neutral_news': status.get('neutral_count', 0),
        'monitoring_running': status.get('running', False),
        'start_time': status.get('start_time'),
        'last_crawl_time': status.get('last_crawl_time'),
        'sources_status': status.get('sources', {})
    })

if __name__ == '__main__':
    logger.info("启动新闻舆情监控子系统...")
    logger.info(f"监控数据源: {[s['name'] for s in config.NEWS_SOURCES if s.get('enabled', True)]}")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
