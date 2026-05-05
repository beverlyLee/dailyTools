from collections import Counter, defaultdict
from datetime import datetime, timedelta
from .config import config
from .sentiment_analyzer import analyzer
import logging
import math

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HotTopicsCalculator:
    def __init__(self):
        self.config = config.HOT_TOPICS_CONFIG
        self.topic_history = defaultdict(lambda: {
            'mentions': 0,
            'positive': 0,
            'negative': 0,
            'neutral': 0,
            'total_score': 0.0,
            'first_seen': None,
            'last_seen': None
        })
    
    def calculate(self, news_items, top_n=20):
        """
        计算热门话题
        """
        logger.info(f"Calculating hot topics from {len(news_items)} news items")
        
        self._reset_history()
        
        for news in news_items:
            self._process_news(news)
        
        hot_topics = self._rank_topics(top_n)
        
        logger.info(f"Found {len(hot_topics)} hot topics")
        return hot_topics
    
    def _reset_history(self):
        """
        重置历史数据
        """
        self.topic_history.clear()
    
    def _process_news(self, news):
        """
        处理单条新闻
        """
        keywords = news.get('keywords', [])
        sentiment = news.get('sentiment', 'neutral')
        score = news.get('sentiment_score', 0.5)
        
        text = news.get('title', '') + ' ' + news.get('summary', '') + ' ' + news.get('content', '')
        additional_keywords = self._extract_keywords(text)
        keywords = list(set(keywords + additional_keywords))
        
        for keyword in keywords:
            if not self._is_valid_topic(keyword):
                continue
            
            topic_data = self.topic_history[keyword]
            topic_data['mentions'] += 1
            topic_data[sentiment] += 1
            topic_data['total_score'] += score
            
            now = datetime.now()
            if not topic_data['first_seen']:
                topic_data['first_seen'] = now
            topic_data['last_seen'] = now
    
    def _extract_keywords(self, text):
        """
        从文本中提取关键词
        """
        import jieba.analyse
        
        if not text or len(text.strip()) == 0:
            return []
        
        try:
            keywords = jieba.analyse.extract_tags(
                text,
                topK=10,
                withWeight=False,
                allowPOS=('n', 'vn', 'v', 'nz')
            )
            return keywords
        except Exception as e:
            logger.error(f"Error extracting keywords: {str(e)}")
            return []
    
    def _is_valid_topic(self, keyword):
        """
        判断是否为有效话题
        """
        if not keyword or len(keyword) < 2:
            return False
        
        stop_words = {
            '的', '了', '是', '在', '有', '和', '与', '或', '这', '那',
            '我', '你', '他', '她', '它', '我们', '你们', '他们',
            '什么', '怎么', '为什么', '如何', '可以', '能够', '会',
            '今天', '明天', '昨天', '上周', '下周', '今年', '去年', '明年',
            '一个', '一些', '很多', '部分', '全部', '这个', '那个',
            '新闻', '报道', '消息', '文章', '内容', '标题', '摘要'
        }
        
        if keyword in stop_words:
            return False
        
        if keyword.isdigit():
            return False
        
        return True
    
    def _rank_topics(self, top_n):
        """
        对话题进行排名
        """
        ranked_topics = []
        
        for topic, data in self.topic_history.items():
            if data['mentions'] < self.config.get('min_mentions', 5):
                continue
            
            heat_score = self._calculate_heat_score(topic, data)
            
            total = data['positive'] + data['negative'] + data['neutral']
            if total == 0:
                avg_score = 0.5
                dominant_sentiment = 'neutral'
            else:
                avg_score = data['total_score'] / total
                
                if data['positive'] > data['negative'] and data['positive'] > data['neutral']:
                    dominant_sentiment = 'positive'
                elif data['negative'] > data['positive'] and data['negative'] > data['neutral']:
                    dominant_sentiment = 'negative'
                else:
                    dominant_sentiment = 'neutral'
            
            ranked_topics.append({
                'topic': topic,
                'mentions': data['mentions'],
                'heat': round(heat_score, 1),
                'sentiment': dominant_sentiment,
                'avg_score': round(avg_score, 4),
                'breakdown': {
                    'positive': data['positive'],
                    'negative': data['negative'],
                    'neutral': data['neutral']
                },
                'first_seen': data['first_seen'].isoformat() if data['first_seen'] else None,
                'last_seen': data['last_seen'].isoformat() if data['last_seen'] else None
            })
        
        ranked_topics.sort(key=lambda x: x['heat'], reverse=True)
        
        return ranked_topics[:top_n]
    
    def _calculate_heat_score(self, topic, data):
        """
        计算热度分数
        """
        mentions = data['mentions']
        
        if data['first_seen'] and data['last_seen']:
            time_diff = (data['last_seen'] - data['first_seen']).total_seconds() / 3600
            if time_diff > 0:
                frequency = mentions / max(time_diff, 1)
            else:
                frequency = mentions
        else:
            frequency = mentions
        
        sentiment_score = abs(data['total_score'] / max(mentions, 1) - 0.5) * 2
        
        heat = (
            math.log(mentions + 1) * 30 +
            frequency * 10 +
            sentiment_score * 20
        )
        
        heat = min(heat, 100)
        
        return heat
    
    def get_trending_topics(self, news_items, hours=24, top_n=10):
        """
        获取趋势话题
        """
        now = datetime.now()
        cutoff_time = now - timedelta(hours=hours)
        
        recent_news = []
        for news in news_items:
            try:
                crawl_time = datetime.fromisoformat(news.get('crawl_time', ''))
                if crawl_time >= cutoff_time:
                    recent_news.append(news)
            except:
                continue
        
        return self.calculate(recent_news, top_n)
    
    def compare_sentiment(self, topics_news):
        """
        比较不同话题的情感
        """
        comparison = {}
        
        for topic, news_list in topics_news.items():
            sentiments = {'positive': 0, 'negative': 0, 'neutral': 0}
            total_score = 0.0
            
            for news in news_list:
                sentiment = news.get('sentiment', 'neutral')
                score = news.get('sentiment_score', 0.5)
                
                sentiments[sentiment] += 1
                total_score += score
            
            total = len(news_list)
            if total > 0:
                avg_score = total_score / total
            else:
                avg_score = 0.5
            
            comparison[topic] = {
                'count': total,
                'sentiments': sentiments,
                'avg_score': round(avg_score, 4)
            }
        
        return comparison
    
    def get_topic_evolution(self, news_items, topic, interval_hours=1):
        """
        获取话题的演变趋势
        """
        evolution = []
        
        now = datetime.now()
        start_time = now - timedelta(hours=24)
        
        intervals = []
        current = start_time
        while current <= now:
            intervals.append({
                'start': current,
                'end': current + timedelta(hours=interval_hours),
                'mentions': 0,
                'positive': 0,
                'negative': 0,
                'neutral': 0,
                'total_score': 0.0
            })
            current += timedelta(hours=interval_hours)
        
        for news in news_items:
            try:
                crawl_time = datetime.fromisoformat(news.get('crawl_time', ''))
                
                if topic not in news.get('keywords', []):
                    continue
                
                for interval in intervals:
                    if interval['start'] <= crawl_time < interval['end']:
                        interval['mentions'] += 1
                        sentiment = news.get('sentiment', 'neutral')
                        interval[sentiment] += 1
                        interval['total_score'] += news.get('sentiment_score', 0.5)
                        break
            except:
                continue
        
        for interval in intervals:
            if interval['mentions'] > 0:
                avg_score = interval['total_score'] / interval['mentions']
            else:
                avg_score = 0.5
            
            evolution.append({
                'time': interval['start'].strftime('%H:00'),
                'mentions': interval['mentions'],
                'positive': interval['positive'],
                'negative': interval['negative'],
                'neutral': interval['neutral'],
                'avg_score': round(avg_score, 4)
            })
        
        return evolution

hot_topics_calculator = HotTopicsCalculator()
