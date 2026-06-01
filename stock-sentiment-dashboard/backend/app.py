from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.market_data.tushare_client import TushareClient
from src.news_crawler.rss_reader import RSSReader
from src.sentiment.llm_sentiment import VolcengineSentiment

app = Flask(__name__)

# 最简单直接的 CORS 配置 - 完全禁用限制
CORS(app)

tushare_client = None
rss_reader = None
sentiment_analyzer = None

def init_clients():
    global tushare_client, rss_reader, sentiment_analyzer
    
    try:
        tushare_client = TushareClient()
    except Exception as e:
        print(f"Warning: Failed to init TushareClient: {e}")
    
    rss_reader = RSSReader()
    rss_reader.start_auto_fetch()
    
    sentiment_analyzer = VolcengineSentiment()

def normalize_ts_code(ts_code: str) -> str:
    if '.' not in ts_code:
        if ts_code.startswith('6'):
            return f"{ts_code}.SH"
        else:
            return f"{ts_code}.SZ"
    return ts_code

@app.route('/api/stock/<ts_code>', methods=['GET'])
def get_stock_info(ts_code):
    try:
        normalized_code = normalize_ts_code(ts_code)
        
        if tushare_client:
            stock_info = tushare_client.get_stock_quote(normalized_code)
        else:
            stock_info = {
                'ts_code': normalized_code,
                'name': '贵州茅台',
                'industry': '白酒',
                'close': 1850.50,
                'pe': 35.2,
                'pb': 12.5,
                'total_mv': 232000000,
                'main_net_inflow': 528000000,
                'main_net_inflow_ratio': 2.3
            }
        
        return jsonify({
            'success': True,
            'data': stock_info
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stock/<ts_code>/chart', methods=['GET'])
def get_stock_chart(ts_code):
    try:
        normalized_code = normalize_ts_code(ts_code)
        trade_date = request.args.get('trade_date')
        
        if tushare_client:
            chart_data = tushare_client.get_intraday_chart(normalized_code, trade_date)
        else:
            import random
            base_price = 1850
            times = []
            prices = []
            volumes = []
            
            for hour in range(9, 12):
                for minute in range(0, 60):
                    if hour == 9 and minute < 30:
                        continue
                    time_str = f"{hour:02d}:{minute:02d}:00"
                    times.append(time_str)
                    price = base_price + random.uniform(-10, 15)
                    prices.append(round(price, 2))
                    volumes.append(random.randint(1000, 5000))
            
            for hour in range(13, 16):
                for minute in range(0, 60):
                    if hour == 15 and minute > 0:
                        break
                    time_str = f"{hour:02d}:{minute:02d}:00"
                    times.append(time_str)
                    price = base_price + random.uniform(-10, 15)
                    prices.append(round(price, 2))
                    volumes.append(random.randint(1000, 5000))
            
            chart_data = {
                'times': times,
                'prices': prices,
                'volumes': volumes
            }
        
        return jsonify({
            'success': True,
            'data': chart_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stock/<ts_code>/moneyflow', methods=['GET'])
def get_moneyflow(ts_code):
    try:
        normalized_code = normalize_ts_code(ts_code)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if tushare_client:
            moneyflow_data = tushare_client.get_main_net_inflow(normalized_code, start_date, end_date)
        else:
            import random
            moneyflow_data = []
            from datetime import datetime, timedelta
            
            base_date = datetime.now()
            for i in range(30):
                current_date = base_date - timedelta(days=i)
                moneyflow_data.append({
                    'trade_date': current_date.strftime('%Y%m%d'),
                    'main_net_inflow': random.randint(-500000000, 800000000),
                    'main_net_inflow_ratio': round(random.uniform(-3, 4), 2),
                    'buy_elg_elg_amount': random.randint(500000000, 1500000000),
                    'sell_elg_amount': random.randint(500000000, 1500000000),
                    'net_mf_vol': random.randint(-1000000, 1000000)
                })
            moneyflow_data.reverse()
        
        return jsonify({
            'success': True,
            'data': moneyflow_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/news', methods=['GET'])
def get_news():
    try:
        count = int(request.args.get('count', 10))
        news_list = rss_reader.get_latest_news(count)
        
        news_with_sentiment = sentiment_analyzer.batch_analyze(news_list)
        
        return jsonify({
            'success': True,
            'data': news_with_sentiment
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/news/<ts_code>', methods=['GET'])
def get_news_by_stock(ts_code):
    try:
        count = int(request.args.get('count', 10))
        news_list = rss_reader.get_latest_news(50)
        
        filtered_news = rss_reader.filter_news_by_stock(ts_code, news_list)[:count]
        
        news_with_sentiment = sentiment_analyzer.batch_analyze(filtered_news)
        
        stats = sentiment_analyzer.get_sentiment_stats(news_with_sentiment)
        
        return jsonify({
            'success': True,
            'data': news_with_sentiment,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/sentiment/stats', methods=['GET'])
def get_sentiment_stats():
    try:
        news_list = rss_reader.get_latest_news(50)
        news_with_sentiment = sentiment_analyzer.batch_analyze(news_list)
        stats = sentiment_analyzer.get_sentiment_stats(news_with_sentiment)
        
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'status': 'healthy',
        'tushare_available': tushare_client is not None,
        'rss_available': rss_reader is not None,
        'sentiment_available': sentiment_analyzer is not None
    })

if __name__ == '__main__':
    init_clients()
    app.run(host='0.0.0.0', port=8001, debug=True)
