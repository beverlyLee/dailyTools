from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import json

sentiment_bp = Blueprint('sentiment', __name__)

mock_news_data = [
    {
        'id': '1',
        'title': '央行降准释放流动性，市场预期宽松政策持续',
        'source': '财经网',
        'content': '央行今日宣布降准0.5个百分点，释放长期资金约1万亿元。市场分析认为，这将进一步缓解市场流动性压力，对股市形成利好。',
        'sentiment': 'positive',
        'score': 0.85,
        'publishTime': '2026-05-05 14:30:00',
        'sourceType': 'news',
        'relatedStocks': ['000001', '600000'],
        'keywords': ['降准', '流动性', '宽松政策', '股市']
    },
    {
        'id': '2',
        'title': '某科技公司营收不及预期，股价大跌',
        'source': '东方财富',
        'content': '某知名科技公司发布2026年第一季度财报，营收同比增长仅为5%，远低于市场预期的15%。受此消息影响，公司股价今日开盘即大跌8%。',
        'sentiment': 'negative',
        'score': 0.25,
        'publishTime': '2026-05-05 13:45:00',
        'sourceType': 'news',
        'relatedStocks': ['300750'],
        'keywords': ['科技公司', '财报', '营收', '股价大跌']
    },
    {
        'id': '3',
        'title': '新能源汽车行业分析报告发布',
        'source': '同花顺',
        'content': '某知名券商发布新能源汽车行业分析报告，预计2026年全球新能源汽车销量将达到1500万辆，同比增长40%。报告同时指出，行业竞争将进一步加剧。',
        'sentiment': 'neutral',
        'score': 0.55,
        'publishTime': '2026-05-05 12:20:00',
        'sourceType': 'news',
        'relatedStocks': ['002594', '600030'],
        'keywords': ['新能源汽车', '销量', '行业报告', '竞争']
    },
    {
        'id': '4',
        'title': '网友热议：AI概念股还能涨多久？',
        'source': '雪球',
        'content': '最近AI概念股表现强劲，不少投资者担心估值过高。有网友表示，AI是未来趋势，但短期涨幅过大需要谨慎。也有网友认为，AI概念才刚刚开始，还有很大上涨空间。',
        'sentiment': 'neutral',
        'score': 0.50,
        'publishTime': '2026-05-05 11:30:00',
        'sourceType': 'social',
        'relatedStocks': ['002230', '300418'],
        'keywords': ['AI', '概念股', '估值', '投资']
    },
    {
        'id': '5',
        'title': '利好！政策支持半导体产业发展',
        'source': '微博财经',
        'content': '国家发改委今日发布《关于促进集成电路产业和软件产业高质量发展的若干政策》，将对半导体企业给予税收优惠、资金支持等多方面扶持。业内人士认为，这将极大促进我国半导体产业的发展。',
        'sentiment': 'positive',
        'score': 0.78,
        'publishTime': '2026-05-05 10:15:00',
        'sourceType': 'social',
        'relatedStocks': ['603501', '002371'],
        'keywords': ['半导体', '政策支持', '税收优惠', '集成电路']
    }
]

mock_trend_data = {
    'dates': ['5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7'],
    'positive': [120, 150, 130, 180, 200, 170, 190],
    'negative': [80, 60, 90, 70, 50, 80, 60],
    'neutral': [150, 140, 160, 150, 170, 160, 180]
}

mock_hot_topics = [
    {'topic': 'AI概念', 'heat': 95, 'mentions': 12500, 'sentiment': 'positive'},
    {'topic': '新能源', 'heat': 85, 'mentions': 9800, 'sentiment': 'positive'},
    {'topic': '半导体', 'heat': 75, 'mentions': 8200, 'sentiment': 'neutral'},
    {'topic': '消费电子', 'heat': 65, 'mentions': 6500, 'sentiment': 'neutral'},
    {'topic': '医药生物', 'heat': 60, 'mentions': 5800, 'sentiment': 'negative'},
    {'topic': '金融科技', 'heat': 55, 'mentions': 5200, 'sentiment': 'positive'},
    {'topic': '房地产', 'heat': 50, 'mentions': 4500, 'sentiment': 'negative'},
    {'topic': '军工', 'heat': 45, 'mentions': 3800, 'sentiment': 'neutral'}
]

monitoring_status = {
    'running': False,
    'startTime': None,
    'newsCount': 0,
    'sources': []
}

@sentiment_bp.route('/news', methods=['GET'])
def get_news():
    source_type = request.args.get('sourceType', 'all')
    sentiment_type = request.args.get('sentimentType', 'all')
    
    filtered_news = mock_news_data
    
    if source_type != 'all':
        filtered_news = [news for news in filtered_news if news['sourceType'] == source_type]
    
    if sentiment_type != 'all':
        filtered_news = [news for news in filtered_news if news['sentiment'] == sentiment_type]
    
    return jsonify(filtered_news)

@sentiment_bp.route('/trend', methods=['GET'])
def get_trend():
    days = request.args.get('days', 7, type=int)
    
    result = {
        'dates': mock_trend_data['dates'][-days:],
        'positive': mock_trend_data['positive'][-days:],
        'negative': mock_trend_data['negative'][-days:],
        'neutral': mock_trend_data['neutral'][-days:]
    }
    
    return jsonify(result)

@sentiment_bp.route('/hot-topics', methods=['GET'])
def get_hot_topics():
    limit = request.args.get('limit', 10, type=int)
    
    return jsonify(mock_hot_topics[:limit])

@sentiment_bp.route('/start', methods=['POST'])
def start_monitoring():
    global monitoring_status
    
    data = request.get_json() or {}
    sources = data.get('sources', [])
    interval = data.get('interval', 300)
    
    monitoring_status['running'] = True
    monitoring_status['startTime'] = datetime.now().isoformat()
    monitoring_status['sources'] = sources if sources else ['财经网', '东方财富', '同花顺', '微博财经', '雪球']
    
    return jsonify({
        'success': True,
        'message': '监控已启动',
        'status': monitoring_status
    })

@sentiment_bp.route('/stop', methods=['POST'])
def stop_monitoring():
    global monitoring_status
    
    monitoring_status['running'] = False
    
    return jsonify({
        'success': True,
        'message': '监控已停止',
        'status': monitoring_status
    })

@sentiment_bp.route('/status', methods=['GET'])
def get_status():
    return jsonify(monitoring_status)

@sentiment_bp.route('/news/<news_id>', methods=['GET'])
def get_news_detail(news_id):
    for news in mock_news_data:
        if news['id'] == news_id:
            return jsonify(news)
    
    return jsonify({'error': '新闻不存在'}), 404

@sentiment_bp.route('/analyze', methods=['POST'])
def analyze_sentiment():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': '请提供要分析的文本'}), 400
    
    text = data['text']
    
    from utils.sentiment_analyzer import analyze_sentiment
    
    result = analyze_sentiment(text)
    
    return jsonify(result)
