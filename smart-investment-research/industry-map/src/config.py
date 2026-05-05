import os
from dotenv import load_dotenv

load_dotenv()

class IndustryMapConfig:
    INDUSTRY_DATA = {
        '新能源': {
            'upstream': [
                {'name': '锂矿资源', 'companies': 8, 'market_cap': 3500},
                {'name': '正极材料', 'companies': 12, 'market_cap': 2800},
                {'name': '负极材料', 'companies': 10, 'market_cap': 2200},
                {'name': '电解液', 'companies': 8, 'market_cap': 1800},
                {'name': '隔膜', 'companies': 6, 'market_cap': 1500}
            ],
            'midstream': [
                {'name': '动力电池', 'companies': 15, 'market_cap': 15000},
                {'name': '电机电控', 'companies': 12, 'market_cap': 4500},
                {'name': 'BMS系统', 'companies': 8, 'market_cap': 2200},
                {'name': '热管理', 'companies': 6, 'market_cap': 1800}
            ],
            'downstream': [
                {'name': '整车制造', 'companies': 20, 'market_cap': 35000},
                {'name': '充电桩', 'companies': 10, 'market_cap': 3500},
                {'name': '回收利用', 'companies': 5, 'market_cap': 800},
                {'name': '运营服务', 'companies': 8, 'market_cap': 1200}
            ]
        },
        '半导体': {
            'upstream': [
                {'name': '晶圆制造', 'companies': 6, 'market_cap': 8000},
                {'name': '光刻机', 'companies': 3, 'market_cap': 5000},
                {'name': '光刻胶', 'companies': 8, 'market_cap': 2500},
                {'name': '半导体材料', 'companies': 12, 'market_cap': 4000}
            ],
            'midstream': [
                {'name': '芯片设计', 'companies': 25, 'market_cap': 12000},
                {'name': '封装测试', 'companies': 15, 'market_cap': 6000},
                {'name': '晶圆代工', 'companies': 8, 'market_cap': 10000}
            ],
            'downstream': [
                {'name': '消费电子', 'companies': 30, 'market_cap': 25000},
                {'name': '汽车电子', 'companies': 15, 'market_cap': 12000},
                {'name': '工业控制', 'companies': 12, 'market_cap': 8000},
                {'name': '通信设备', 'companies': 10, 'market_cap': 15000}
            ]
        },
        '人工智能': {
            'upstream': [
                {'name': '算力芯片', 'companies': 8, 'market_cap': 20000},
                {'name': '数据中心', 'companies': 10, 'market_cap': 15000},
                {'name': '云计算', 'companies': 8, 'market_cap': 18000},
                {'name': '算法框架', 'companies': 5, 'market_cap': 8000}
            ],
            'midstream': [
                {'name': '大模型', 'companies': 12, 'market_cap': 25000},
                {'name': 'AI训练', 'companies': 8, 'market_cap': 12000},
                {'name': 'AI推理', 'companies': 10, 'market_cap': 10000},
                {'name': 'AI平台', 'companies': 6, 'market_cap': 8000}
            ],
            'downstream': [
                {'name': '智能客服', 'companies': 15, 'market_cap': 5000},
                {'name': '自动驾驶', 'companies': 10, 'market_cap': 15000},
                {'name': '智慧医疗', 'companies': 8, 'market_cap': 8000},
                {'name': '智能金融', 'companies': 12, 'market_cap': 10000}
            ]
        }
    }
    
    COMPANY_DATA = {
        '宁德时代': {
            'id': '1',
            'name': '宁德时代',
            'code': '300750',
            'industry': '新能源',
            'segment': '中游',
            'market_cap': 8500,
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
            'related_companies': [
                {'name': '特斯拉', 'type': '客户', 'relation': '核心供应商'},
                {'name': '比亚迪', 'type': '竞争对手', 'relation': '主要竞争者'},
                {'name': '天齐锂业', 'type': '供应商', 'relation': '锂矿供应商'}
            ]
        },
        '比亚迪': {
            'id': '2',
            'name': '比亚迪',
            'code': '002594',
            'industry': '新能源',
            'segment': '下游',
            'market_cap': 7200,
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
            'shareholders': [
                {'name': '王传福', 'ratio': 17.64},
                {'name': '香港中央结算有限公司', 'ratio': 12.35},
                {'name': '吕向阳', 'ratio': 8.78}
            ],
            'related_companies': [
                {'name': '宁德时代', 'type': '供应商/竞争对手', 'relation': '电池供应商及竞争者'},
                {'name': '特斯拉', 'type': '竞争对手', 'relation': '新能源汽车竞争者'},
                {'name': '长城汽车', 'type': '竞争对手', 'relation': '传统车企转型竞争者'}
            ]
        }
    }
    
    INDUSTRY_RELATIONS = {
        '新能源': {
            'nodes': [
                {'id': 'lithium', 'name': '锂矿资源', 'category': '上游', 'symbolSize': 50},
                {'id': 'cathode', 'name': '正极材料', 'category': '上游', 'symbolSize': 45},
                {'id': 'anode', 'name': '负极材料', 'category': '上游', 'symbolSize': 40},
                {'id': 'electrolyte', 'name': '电解液', 'category': '上游', 'symbolSize': 38},
                {'id': 'separator', 'name': '隔膜', 'category': '上游', 'symbolSize': 35},
                {'id': 'battery', 'name': '动力电池', 'category': '中游', 'symbolSize': 55},
                {'id': 'motor', 'name': '电机电控', 'category': '中游', 'symbolSize': 50},
                {'id': 'vehicle', 'name': '整车制造', 'category': '下游', 'symbolSize': 60},
                {'id': 'charging', 'name': '充电桩', 'category': '下游', 'symbolSize': 48},
                {'id': 'recycle', 'name': '回收利用', 'category': '下游', 'symbolSize': 40},
                {'id': 'catl', 'name': '宁德时代', 'category': '关联企业', 'symbolSize': 52},
                {'id': 'byd', 'name': '比亚迪', 'category': '关联企业', 'symbolSize': 50},
                {'id': 'tesla', 'name': '特斯拉', 'category': '关联企业', 'symbolSize': 58}
            ],
            'links': [
                {'source': 'lithium', 'target': 'cathode'},
                {'source': 'cathode', 'target': 'battery'},
                {'source': 'anode', 'target': 'battery'},
                {'source': 'electrolyte', 'target': 'battery'},
                {'source': 'separator', 'target': 'battery'},
                {'source': 'battery', 'target': 'vehicle'},
                {'source': 'motor', 'target': 'vehicle'},
                {'source': 'vehicle', 'target': 'charging'},
                {'source': 'battery', 'target': 'recycle'},
                {'source': 'catl', 'target': 'battery'},
                {'source': 'byd', 'target': 'vehicle'},
                {'source': 'byd', 'target': 'battery'},
                {'source': 'tesla', 'target': 'vehicle'}
            ],
            'categories': [
                {'name': '上游'},
                {'name': '中游'},
                {'name': '下游'},
                {'name': '关联企业'}
            ]
        }
    }
    
    DATABASE_CONFIG = {
        'mongodb_uri': os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'),
        'database_name': 'industry_map',
        'collections': {
            'companies': 'companies',
            'industries': 'industries',
            'relations': 'relations',
            'financial_data': 'financial_data'
        }
    }
    
    FINANCIAL_METRICS = {
        'pe': {'name': '市盈率', 'unit': 'x', 'description': '股价与每股收益的比率'},
        'pb': {'name': '市净率', 'unit': 'x', 'description': '股价与每股净资产的比率'},
        'roe': {'name': '净资产收益率', 'unit': '%', 'description': '净利润与平均股东权益的百分比'},
        'eps': {'name': '每股收益', 'unit': '元', 'description': '税后利润与股本总数的比率'},
        'market_cap': {'name': '市值', 'unit': '亿元', 'description': '公司股票的市场价值总额'},
        'revenue': {'name': '营业收入', 'unit': '亿元', 'description': '公司销售商品或提供服务所获得的收入'},
        'profit': {'name': '净利润', 'unit': '亿元', 'description': '公司在利润总额中按规定交纳了所得税后公司的利润留成'}
    }

config = IndustryMapConfig()
