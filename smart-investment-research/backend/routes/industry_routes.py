from flask import Blueprint, jsonify, request
from config import config

industry_bp = Blueprint('industry', __name__)

mock_company_data = [
    {
        'id': '1',
        'name': '宁德时代',
        'code': '300750',
        'industry': '新能源',
        'segment': '中游',
        'marketCap': 8500,
        'pe': 35.2,
        'pb': 8.5,
        'roe': 18.5,
        'eps': 12.5,
        'revenue': '3285.9亿',
        'profit': '457.8亿',
        'growth': {
            'revenue': 38.5,
            'profit': 42.3
        },
        'change': 2.3
    },
    {
        'id': '2',
        'name': '比亚迪',
        'code': '002594',
        'industry': '新能源',
        'segment': '下游',
        'marketCap': 7200,
        'pe': 28.5,
        'pb': 6.2,
        'roe': 22.3,
        'eps': 8.7,
        'revenue': '6200.5亿',
        'profit': '385.2亿',
        'growth': {
            'revenue': 45.2,
            'profit': 52.1
        },
        'change': -1.2
    },
    {
        'id': '3',
        'name': '特斯拉',
        'code': 'TSLA',
        'industry': '新能源',
        'segment': '下游',
        'marketCap': 15000,
        'pe': 45.8,
        'pb': 12.3,
        'roe': 25.8,
        'eps': 15.2,
        'revenue': '9800.0亿',
        'profit': '1200.5亿',
        'growth': {
            'revenue': 35.8,
            'profit': 48.2
        },
        'change': 3.5
    },
    {
        'id': '4',
        'name': 'LG新能源',
        'code': '373220',
        'industry': '新能源',
        'segment': '中游',
        'marketCap': 3200,
        'pe': 22.3,
        'pb': 5.8,
        'roe': 15.2,
        'eps': 6.8,
        'revenue': '1800.0亿',
        'profit': '156.8亿',
        'growth': {
            'revenue': 28.5,
            'profit': 32.1
        },
        'change': 0.8
    },
    {
        'id': '5',
        'name': '国轩高科',
        'code': '002074',
        'industry': '新能源',
        'segment': '中游',
        'marketCap': 650,
        'pe': 18.7,
        'pb': 4.2,
        'roe': 12.7,
        'eps': 3.2,
        'revenue': '280.5亿',
        'profit': '28.5亿',
        'growth': {
            'revenue': 22.3,
            'profit': 25.8
        },
        'change': -0.5
    }
]

mock_company_detail = {
    '1': {
        'name': '宁德时代',
        'code': '300750',
        'segment': '中游',
        'industry': '动力电池',
        'marketCap': 8500,
        'pe': 35.2,
        'pb': 8.5,
        'roe': 18.5,
        'eps': 12.5,
        'revenue': '3285.9亿',
        'profit': '457.8亿',
        'growth': {
            'revenue': 38.5,
            'profit': 42.3
        },
        'shareholders': [
            {'name': '宁波梅山保税港区瑞庭投资有限公司', 'ratio': 24.53},
            {'name': '香港中央结算有限公司', 'ratio': 8.76},
            {'name': '黄世霖', 'ratio': 5.42},
            {'name': '李平', 'ratio': 4.28}
        ],
        'relatedCompanies': [
            {'name': '特斯拉', 'type': '客户', 'relation': '核心供应商'},
            {'name': '比亚迪', 'type': '竞争对手', 'relation': '主要竞争者'},
            {'name': '天齐锂业', 'type': '供应商', 'relation': '锂矿供应商'}
        ]
    }
}

mock_industry_chain = {
    '新能源': {
        'upstream': [
            {'name': '锂矿资源', 'companies': 8, 'marketCap': 3500},
            {'name': '正极材料', 'companies': 12, 'marketCap': 2800},
            {'name': '负极材料', 'companies': 10, 'marketCap': 2200},
            {'name': '电解液', 'companies': 8, 'marketCap': 1800},
            {'name': '隔膜', 'companies': 6, 'marketCap': 1500}
        ],
        'midstream': [
            {'name': '动力电池', 'companies': 15, 'marketCap': 15000},
            {'name': '电机电控', 'companies': 12, 'marketCap': 4500},
            {'name': 'BMS系统', 'companies': 8, 'marketCap': 2200},
            {'name': '热管理', 'companies': 6, 'marketCap': 1800}
        ],
        'downstream': [
            {'name': '整车制造', 'companies': 20, 'marketCap': 35000},
            {'name': '充电桩', 'companies': 10, 'marketCap': 3500},
            {'name': '回收利用', 'companies': 5, 'marketCap': 800},
            {'name': '运营服务', 'companies': 8, 'marketCap': 1200}
        ]
    }
}

mock_financial_data = {
    '新能源': {
        'companies': ['宁德时代', '比亚迪', '特斯拉', 'LG新能源', '国轩高科'],
        'pe': [35.2, 28.5, 45.8, 22.3, 18.7],
        'pb': [8.5, 6.2, 12.3, 5.8, 4.2],
        'roe': [18.5, 22.3, 25.8, 15.2, 12.7]
    }
}

@industry_bp.route('/chain', methods=['GET'])
def get_industry_chain():
    industry = request.args.get('industry', '新能源')
    
    if industry in mock_industry_chain:
        return jsonify(mock_industry_chain[industry])
    else:
        return jsonify({
            'upstream': [],
            'midstream': [],
            'downstream': []
        })

@industry_bp.route('/companies', methods=['GET'])
def get_companies():
    industry = request.args.get('industry', '新能源')
    segment = request.args.get('segment', 'all')
    
    filtered_companies = [
        company for company in mock_company_data 
        if company['industry'] == industry
    ]
    
    if segment != 'all':
        filtered_companies = [
            company for company in filtered_companies 
            if company['segment'] == segment
        ]
    
    return jsonify(filtered_companies)

@industry_bp.route('/company/<company_id>', methods=['GET'])
def get_company_detail(company_id):
    if company_id in mock_company_detail:
        return jsonify(mock_company_detail[company_id])
    
    for company in mock_company_data:
        if company['id'] == company_id:
            return jsonify({
                **company,
                'shareholders': [
                    {'name': '主要股东1', 'ratio': 15.5},
                    {'name': '主要股东2', 'ratio': 8.2},
                    {'name': '主要股东3', 'ratio': 5.3}
                ],
                'relatedCompanies': [
                    {'name': '相关公司A', 'type': '客户', 'relation': '核心客户'},
                    {'name': '相关公司B', 'type': '供应商', 'relation': '主要供应商'}
                ]
            })
    
    return jsonify({'error': '公司不存在'}), 404

@industry_bp.route('/financial', methods=['GET'])
def get_financial_data():
    industry = request.args.get('industry', '新能源')
    
    if industry in mock_financial_data:
        return jsonify(mock_financial_data[industry])
    else:
        return jsonify({
            'companies': [],
            'pe': [],
            'pb': [],
            'roe': []
        })

@industry_bp.route('/company/<company_id>/shareholders', methods=['GET'])
def get_shareholders(company_id):
    if company_id in mock_company_detail:
        return jsonify(mock_company_detail[company_id]['shareholders'])
    
    return jsonify([
        {'name': '主要股东1', 'ratio': 15.5},
        {'name': '主要股东2', 'ratio': 8.2},
        {'name': '主要股东3', 'ratio': 5.3}
    ])

@industry_bp.route('/company/<company_id>/related', methods=['GET'])
def get_related_companies(company_id):
    if company_id in mock_company_detail:
        return jsonify(mock_company_detail[company_id]['relatedCompanies'])
    
    return jsonify([
        {'name': '相关公司A', 'type': '客户', 'relation': '核心客户'},
        {'name': '相关公司B', 'type': '供应商', 'relation': '主要供应商'}
    ])

@industry_bp.route('/search', methods=['GET'])
def search_companies():
    keyword = request.args.get('keyword', '')
    
    if not keyword:
        return jsonify([])
    
    results = []
    for company in mock_company_data:
        if keyword.lower() in company['name'].lower() or keyword in company['code']:
            results.append(company)
    
    return jsonify(results)

@industry_bp.route('/list', methods=['GET'])
def get_industry_list():
    return jsonify(list(config.INDUSTRY_DATA.keys()))

@industry_bp.route('/segments', methods=['GET'])
def get_industry_segments():
    industry = request.args.get('industry', '新能源')
    
    if industry in config.INDUSTRY_DATA:
        return jsonify(config.INDUSTRY_DATA[industry])
    else:
        return jsonify({
            'upstream': [],
            'midstream': [],
            'downstream': []
        })
