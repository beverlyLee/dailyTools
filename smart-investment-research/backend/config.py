import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'smart-investment-research-secret-key'
    
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    MONGODB_URI = os.environ.get('MONGODB_URI') or 'mongodb://localhost:27017/smart_investment'
    
    DATABASE_URI = os.environ.get('DATABASE_URI') or 'postgresql://postgres:postgres@localhost:5432/smart_investment'
    
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL') or REDIS_URL
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND') or REDIS_URL
    
    NEWS_SOURCES = [
        {
            'name': '财经网',
            'url': 'https://www.caijing.com.cn',
            'type': 'news',
            'interval': 300
        },
        {
            'name': '东方财富',
            'url': 'https://www.eastmoney.com',
            'type': 'news',
            'interval': 300
        },
        {
            'name': '同花顺',
            'url': 'https://www.10jqka.com.cn',
            'type': 'news',
            'interval': 300
        },
        {
            'name': '微博财经',
            'url': 'https://weibo.com',
            'type': 'social',
            'interval': 180
        },
        {
            'name': '雪球',
            'url': 'https://xueqiu.com',
            'type': 'social',
            'interval': 180
        }
    ]
    
    INDUSTRY_DATA = {
        '新能源': {
            'upstream': ['锂矿资源', '正极材料', '负极材料', '电解液', '隔膜'],
            'midstream': ['动力电池', '电机电控', 'BMS系统', '热管理'],
            'downstream': ['整车制造', '充电桩', '回收利用', '运营服务']
        },
        '半导体': {
            'upstream': ['晶圆制造', '光刻机', '光刻胶', '半导体材料'],
            'midstream': ['芯片设计', '封装测试', '晶圆代工'],
            'downstream': ['消费电子', '汽车电子', '工业控制', '通信设备']
        },
        '人工智能': {
            'upstream': ['算力芯片', '数据中心', '云计算', '算法框架'],
            'midstream': ['大模型', 'AI训练', 'AI推理', 'AI平台'],
            'downstream': ['智能客服', '自动驾驶', '智慧医疗', '智能金融']
        }
    }
    
    SENTIMENT_THRESHOLD = {
        'positive': 0.6,
        'negative': 0.4
    }

config = Config()
