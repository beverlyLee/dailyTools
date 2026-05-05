import threading
import time
from datetime import datetime, timedelta
from .config import config
from .news_crawler import crawler
from .sentiment_analyzer import analyzer
import logging
import schedule

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MonitoringEngine:
    def __init__(self):
        self.is_running = False
        self.monitoring_thread = None
        self.status = {
            'running': False,
            'start_time': None,
            'news_count': 0,
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'sources': {},
            'last_crawl_time': None
        }
        self.news_buffer = []
        self._init_sources_status()
    
    def _init_sources_status(self):
        """
        初始化各新闻源状态
        """
        for source in config.NEWS_SOURCES:
            self.status['sources'][source['name']] = {
                'enabled': source.get('enabled', True),
                'last_crawl': None,
                'news_count': 0,
                'interval': source.get('interval', 300)
            }
    
    def start(self):
        """
        启动监控
        """
        if self.is_running:
            logger.warning("Monitoring is already running")
            return False
        
        logger.info("Starting monitoring engine...")
        self.is_running = True
        self.status['running'] = True
        self.status['start_time'] = datetime.now().isoformat()
        
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("Monitoring engine started successfully")
        return True
    
    def stop(self):
        """
        停止监控
        """
        if not self.is_running:
            logger.warning("Monitoring is not running")
            return False
        
        logger.info("Stopping monitoring engine...")
        self.is_running = False
        self.status['running'] = False
        
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=10)
        
        logger.info("Monitoring engine stopped")
        return True
    
    def _monitoring_loop(self):
        """
        监控主循环
        """
        logger.info("Monitoring loop started")
        
        while self.is_running:
            try:
                self._crawl_and_analyze()
                
                time.sleep(config.MONITORING_INTERVAL)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                time.sleep(60)
        
        logger.info("Monitoring loop ended")
    
    def _crawl_and_analyze(self):
        """
        爬取并分析新闻
        """
        logger.info("Starting crawl and analyze cycle")
        
        news_items = crawler.crawl_all_sources()
        
        if not news_items:
            logger.info("No news items found in this cycle")
            return
        
        logger.info(f"Found {len(news_items)} news items")
        
        analyzed_count = 0
        for news in news_items:
            try:
                text_to_analyze = news.get('title', '')
                if news.get('summary'):
                    text_to_analyze += ' ' + news.get('summary', '')
                
                sentiment_result = analyzer.analyze(text_to_analyze)
                
                news.update({
                    'sentiment': sentiment_result['sentiment'],
                    'sentiment_score': sentiment_result['score'],
                    'confidence': sentiment_result['confidence'],
                    'keywords': sentiment_result['keywords'],
                    'analysis_time': sentiment_result['analysis_time']
                })
                
                stock_keywords = analyzer.extract_stock_keywords(text_to_analyze)
                news['related_stocks'] = stock_keywords
                
                self._update_statistics(news)
                
                analyzed_count += 1
                
                self.news_buffer.append(news)
                
                if len(self.news_buffer) > 1000:
                    self.news_buffer = self.news_buffer[-500:]
                    
            except Exception as e:
                logger.error(f"Error analyzing news: {str(e)}")
                continue
        
        self.status['last_crawl_time'] = datetime.now().isoformat()
        
        logger.info(f"Analyzed {analyzed_count} news items")
    
    def _update_statistics(self, news):
        """
        更新统计数据
        """
        self.status['news_count'] += 1
        
        sentiment = news.get('sentiment', 'neutral')
        if sentiment == 'positive':
            self.status['positive_count'] += 1
        elif sentiment == 'negative':
            self.status['negative_count'] += 1
        else:
            self.status['neutral_count'] += 1
        
        source = news.get('source')
        if source and source in self.status['sources']:
            self.status['sources'][source]['news_count'] += 1
            self.status['sources'][source]['last_crawl'] = datetime.now().isoformat()
    
    def get_status(self):
        """
        获取当前监控状态
        """
        return self.status.copy()
    
    def get_recent_news(self, limit=100, sentiment=None, source=None):
        """
        获取最近的新闻
        """
        filtered = self.news_buffer
        
        if sentiment:
            filtered = [n for n in filtered if n.get('sentiment') == sentiment]
        
        if source:
            filtered = [n for n in filtered if n.get('source') == source]
        
        return filtered[-limit:]
    
    def get_sentiment_trend(self, hours=24):
        """
        获取情感趋势
        """
        trend = {
            'timestamps': [],
            'positive': [],
            'negative': [],
            'neutral': []
        }
        
        now = datetime.now()
        start_time = now - timedelta(hours=hours)
        
        hourly_stats = {}
        for i in range(hours):
            hour_key = (now - timedelta(hours=i)).strftime('%Y-%m-%d %H:00')
            hourly_stats[hour_key] = {'positive': 0, 'negative': 0, 'neutral': 0}
        
        for news in self.news_buffer:
            try:
                crawl_time = datetime.fromisoformat(news.get('crawl_time', ''))
                if crawl_time >= start_time:
                    hour_key = crawl_time.strftime('%Y-%m-%d %H:00')
                    if hour_key in hourly_stats:
                        sentiment = news.get('sentiment', 'neutral')
                        hourly_stats[hour_key][sentiment] += 1
            except:
                continue
        
        sorted_hours = sorted(hourly_stats.keys())
        for hour in sorted_hours:
            trend['timestamps'].append(hour.split()[1])
            trend['positive'].append(hourly_stats[hour]['positive'])
            trend['negative'].append(hourly_stats[hour]['negative'])
            trend['neutral'].append(hourly_stats[hour]['neutral'])
        
        return trend
    
    def manual_crawl(self, source_name=None):
        """
        手动触发爬取
        """
        logger.info(f"Manual crawl triggered for source: {source_name}")
        
        if source_name:
            sources = [s for s in config.NEWS_SOURCES if s['name'] == source_name]
        else:
            sources = config.NEWS_SOURCES
        
        all_news = []
        for source in sources:
            try:
                news_items = crawler.crawl_source(source)
                all_news.extend(news_items)
            except Exception as e:
                logger.error(f"Manual crawl failed for {source['name']}: {str(e)}")
        
        logger.info(f"Manual crawl completed, found {len(all_news)} items")
        return all_news

monitoring_engine = MonitoringEngine()
