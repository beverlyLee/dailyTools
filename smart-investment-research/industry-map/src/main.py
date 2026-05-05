#!/usr/bin/env python3
"""
产业链图谱子系统
构建上下游产业关系图，穿透查询股东和关联方，关联上市公司财务数据（PE/PB/ROE）进行估值对比
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import logging

from src.config import config
from src.industry_chain_manager import industry_chain_manager
from src.company_manager import company_manager
from src.financial_analyzer import financial_analyzer

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
        'name': '产业链图谱子系统',
        'version': '1.0.0',
        'description': '构建上下游产业关系图，穿透查询股东和关联方，关联上市公司财务数据进行估值对比',
        'endpoints': {
            'industry': '/api/industry',
            'companies': '/api/companies',
            'financial': '/api/financial',
            'valuation': '/api/valuation'
        }
    })

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'industries': industry_chain_manager.get_industry_list()
    })

@app.route('/api/industry/list', methods=['GET'])
def get_industry_list():
    industries = industry_chain_manager.get_industry_list()
    return jsonify(industries)

@app.route('/api/industry/chain/<industry>', methods=['GET'])
def get_industry_chain(industry):
    chain = industry_chain_manager.get_industry_chain(industry)
    if chain:
        return jsonify(chain)
    return jsonify({'error': '行业不存在'}), 404

@app.route('/api/industry/graph/<industry>', methods=['GET'])
def get_industry_graph(industry):
    graph = industry_chain_manager.get_industry_graph(industry)
    if graph:
        return jsonify(graph)
    return jsonify({'error': '行业图谱不存在'}), 404

@app.route('/api/industry/segments/<industry>', methods=['GET'])
def get_industry_segments(industry):
    chain = industry_chain_manager.get_industry_chain(industry)
    if not chain:
        return jsonify({'error': '行业不存在'}), 404
    
    segments = {
        'upstream': chain.get('upstream', []),
        'midstream': chain.get('midstream', []),
        'downstream': chain.get('downstream', [])
    }
    return jsonify(segments)

@app.route('/api/industry/path/<industry>', methods=['GET'])
def find_relation_path(industry):
    start = request.args.get('start')
    end = request.args.get('end')
    
    if not start or not end:
        return jsonify({'error': '请提供起点和终点'}), 400
    
    path = industry_chain_manager.find_relation_path(industry, start, end)
    if path:
        return jsonify({
            'start': start,
            'end': end,
            'path': path
        })
    return jsonify({'error': '未找到关系路径'}), 404

@app.route('/api/industry/compare', methods=['GET'])
def compare_industries():
    industry1 = request.args.get('industry1')
    industry2 = request.args.get('industry2')
    
    if not industry1 or not industry2:
        return jsonify({'error': '请提供两个行业名称'}), 400
    
    comparison = industry_chain_manager.compare_industries(industry1, industry2)
    if comparison:
        return jsonify(comparison)
    return jsonify({'error': '行业不存在'}), 404

@app.route('/api/companies', methods=['GET'])
def get_companies():
    industry = request.args.get('industry')
    segment = request.args.get('segment')
    limit = request.args.get('limit', type=int)
    
    companies = company_manager.get_company_list(industry=industry, segment=segment)
    
    if limit:
        companies = companies[:limit]
    
    return jsonify(companies)

@app.route('/api/companies/search', methods=['GET'])
def search_companies():
    keyword = request.args.get('keyword', '')
    
    if not keyword:
        return jsonify({'error': '请提供搜索关键词'}), 400
    
    results = company_manager.search_companies(keyword)
    return jsonify(results)

@app.route('/api/companies/<company_id>', methods=['GET'])
def get_company_detail(company_id):
    company = company_manager.get_company_by_id(company_id)
    
    if company:
        return jsonify(company)
    
    company = company_manager.get_company_by_code(company_id)
    if company:
        return jsonify(company)
    
    return jsonify({'error': '公司不存在'}), 404

@app.route('/api/companies/<company_id>/shareholders', methods=['GET'])
def get_company_shareholders(company_id):
    shareholders = company_manager.get_shareholders(company_id)
    return jsonify(shareholders)

@app.route('/api/companies/<company_id>/related', methods=['GET'])
def get_related_companies(company_id):
    related = company_manager.get_related_companies(company_id)
    return jsonify(related)

@app.route('/api/companies/<company_id>/financial', methods=['GET'])
def get_company_financial(company_id):
    metrics = company_manager.get_financial_metrics(company_id)
    if metrics:
        return jsonify(metrics)
    return jsonify({'error': '公司不存在'}), 404

@app.route('/api/companies/compare', methods=['POST'])
def compare_multiple_companies():
    data = request.get_json()
    
    if not data or 'company_ids' not in data:
        return jsonify({'error': '请提供公司ID列表'}), 400
    
    company_ids = data['company_ids']
    metrics = data.get('metrics', ['pe', 'pb', 'roe'])
    
    comparison = financial_analyzer.compare_companies(company_ids, metrics)
    return jsonify(comparison)

@app.route('/api/industry/<industry>/averages', methods=['GET'])
def get_industry_averages(industry):
    averages = company_manager.get_industry_averages(industry)
    if averages:
        return jsonify(averages)
    return jsonify({'error': '行业不存在或无数据'}), 404

@app.route('/api/industry/<industry>/segment-comparison', methods=['GET'])
def get_segment_comparison(industry):
    comparison = company_manager.get_segment_comparison(industry)
    return jsonify(comparison)

@app.route('/api/financial/analyze/<company_id>', methods=['GET'])
def analyze_company_financial(company_id):
    analysis = financial_analyzer.analyze_company(company_id)
    if analysis:
        return jsonify(analysis)
    return jsonify({'error': '公司不存在'}), 404

@app.route('/api/financial/industry/<industry>', methods=['GET'])
def analyze_industry_financial(industry):
    analysis = financial_analyzer.analyze_industry(industry)
    if analysis:
        return jsonify(analysis)
    return jsonify({'error': '行业不存在或无数据'}), 404

@app.route('/api/valuation/report/<company_id>', methods=['GET'])
def get_valuation_report(company_id):
    report = financial_analyzer.generate_valuation_report(company_id)
    if report:
        return jsonify(report)
    return jsonify({'error': '公司不存在'}), 404

@app.route('/api/stats', methods=['GET'])
def get_statistics():
    industries = industry_chain_manager.get_industry_list()
    all_companies = company_manager.get_company_list()
    
    industry_stats = {}
    for industry in industries:
        industry_companies = company_manager.get_company_list(industry=industry)
        avg = company_manager.get_industry_averages(industry)
        industry_stats[industry] = {
            'company_count': len(industry_companies),
            'avg_pe': avg.get('avg_pe') if avg else None,
            'avg_pb': avg.get('avg_pb') if avg else None,
            'avg_roe': avg.get('avg_roe') if avg else None
        }
    
    return jsonify({
        'total_industries': len(industries),
        'total_companies': len(all_companies),
        'industries': industries,
        'industry_stats': industry_stats,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    logger.info("启动产业链图谱子系统...")
    logger.info(f"支持的行业: {industry_chain_manager.get_industry_list()}")
    logger.info(f"公司数量: {len(company_manager.get_company_list())}")
    
    app.run(debug=True, host='0.0.0.0', port=5002)
