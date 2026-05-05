import os
from datetime import timedelta

class NewsSentimentConfig:
    MONITORING_INTERVAL = int(os.environ.get('MONITORING_INTERVAL', 300))
    
    NEWS_SOURCES = [
        {
            'name': '财经网',
            'url': 'https://www.caijing.com.cn',
            'type': 'news',
            'enabled': True,
            'interval': 300
        },
        {
            'name': '东方财富',
            'url': 'https://www.eastmoney.com',
            'type': 'news',
            'enabled': True,
            'interval': 300
        },
        {
            'name': '同花顺',
            'url': 'https://www.10jqka.com.cn',
            'type': 'news',
            'enabled': True,
            'interval': 300
        },
        {
            'name': '微博财经',
            'url': 'https://weibo.com',
            'type': 'social',
            'enabled': True,
            'interval': 180
        },
        {
            'name': '雪球',
            'url': 'https://xueqiu.com',
            'type': 'social',
            'enabled': True,
            'interval': 180
        },
        {
            'name': '新浪财经',
            'url': 'https://finance.sina.com.cn',
            'type': 'news',
            'enabled': True,
            'interval': 300
        },
        {
            'name': '腾讯财经',
            'url': 'https://finance.qq.com',
            'type': 'news',
            'enabled': True,
            'interval': 300
        }
    ]
    
    SENTIMENT_CONFIG = {
        'positive_threshold': 0.6,
        'negative_threshold': 0.4,
        'use_snownlp': True,
        'use_rule_based': True
    }
    
    HOT_TOPICS_CONFIG = {
        'top_n': 20,
        'time_window': timedelta(hours=24),
        'min_mentions': 5
    }
    
    DATABASE_CONFIG = {
        'mongodb_uri': os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'),
        'database_name': 'news_sentiment',
        'collections': {
            'news': 'news_articles',
            'sentiment_logs': 'sentiment_logs',
            'hot_topics': 'hot_topics',
            'monitoring_status': 'monitoring_status'
        }
    }
    
    REDIS_CONFIG = {
        'url': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
        'cache_ttl': 300
    }

config = NewsSentimentConfig()
