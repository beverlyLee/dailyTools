import os
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from index.student_cpi import StudentCPI
from spider.tieba_spider import TiebaSpider

app = Flask(__name__)
CORS(app)

cpi_calculator = StudentCPI()


@app.route('/')
def index():
    return jsonify({
        'message': '食堂价格追踪器 API',
        'version': '1.0',
        'endpoints': {
            '/api/cpi': '获取CPI对比数据',
            '/api/posts/<year>': '获取某年份的热门吐槽帖子',
            '/api/spider/run': '运行爬虫'
        }
    })


@app.route('/api/cpi')
def get_cpi_data():
    data = cpi_calculator.get_comparison_data()
    return jsonify(data)


@app.route('/api/posts/<int:year>')
def get_posts_by_year(year):
    posts = cpi_calculator.get_hot_posts_by_year(year)
    return jsonify({
        'year': year,
        'posts': posts
    })


@app.route('/api/spider/run', methods=['POST'])
def run_spider():
    data = request.get_json() or {}
    keywords = data.get('keywords')
    max_pages = data.get('max_pages', 2)
    
    spider = TiebaSpider()
    posts = spider.run_spider(keywords=keywords, max_pages=max_pages)
    spider.save_data()
    
    return jsonify({
        'status': 'success',
        'count': len(posts),
        'posts': posts[:10]
    })


@app.route('/api/price/<int:year>')
def get_price_details(year):
    yearly_data = cpi_calculator.get_yearly_data()
    for item in yearly_data:
        if item['year'] == year:
            return jsonify(item)
    return jsonify({'error': 'Year not found'}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
