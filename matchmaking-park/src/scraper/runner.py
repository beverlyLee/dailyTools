import os
import sys
import json
import pandas as pd
from datetime import datetime

try:
    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings
    SCRAPY_AVAILABLE = True
except ImportError:
    SCRAPY_AVAILABLE = False
    CrawlerProcess = None
    get_project_settings = None

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from src.scraper.spiders.matchmaking_spider import MatchmakingSpider
    SPIDER_AVAILABLE = True
except ImportError:
    SPIDER_AVAILABLE = False
    MatchmakingSpider = None


class ScrapyRunner:
    def __init__(self):
        self.output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            '..', 'data'
        )
        os.makedirs(self.output_dir, exist_ok=True)
    
    def run_spider(self, city=None, park=None):
        if not SCRAPY_AVAILABLE or not SPIDER_AVAILABLE:
            raise ImportError("Scrapy is not installed. Please install scrapy to use this feature.")
        
        settings = get_project_settings()
        settings.set('ITEM_PIPELINES', {
            'src.scraper.pipelines.DuplicatesPipeline': 100,
            'src.scraper.pipelines.OCRValidationPipeline': 200,
            'src.scraper.pipelines.MatchmakingPipeline': 300,
        })
        
        process = CrawlerProcess(settings)
        
        spider_kwargs = {}
        if city:
            spider_kwargs['city'] = city
        if park:
            spider_kwargs['park'] = park
        
        process.crawl(MatchmakingSpider, **spider_kwargs)
        process.start()
        
        return self._get_latest_output()
    
    def _get_latest_output(self):
        files = [f for f in os.listdir(self.output_dir) if f.endswith('.json')]
        if not files:
            return None
        
        latest_file = max(files, key=lambda x: os.path.getctime(os.path.join(self.output_dir, x)))
        return os.path.join(self.output_dir, latest_file)
    
    def get_spider_status(self):
        return {
            'output_directory': self.output_dir,
            'available_data_files': len([f for f in os.listdir(self.output_dir) if f.endswith('.json')]),
            'last_crawl_time': self._get_last_crawl_time(),
            'scrapy_available': SCRAPY_AVAILABLE
        }
    
    def _get_last_crawl_time(self):
        files = [f for f in os.listdir(self.output_dir) if f.endswith('.json')]
        if not files:
            return '从未运行'
        
        latest_file = max(files, key=lambda x: os.path.getctime(os.path.join(self.output_dir, x)))
        timestamp = os.path.getctime(os.path.join(self.output_dir, latest_file))
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')


class DataAdapter:
    @staticmethod
    def scrapy_to_application(scrapy_json_path):
        with open(scrapy_json_path, 'r', encoding='utf-8') as f:
            scrapy_data = json.load(f)
        
        application_data = []
        for item in scrapy_data:
            application_data.append({
                'id': item.get('item_id', ''),
                'city': item.get('city', ''),
                'content': item.get('ocr_raw_text', ''),
                'has_hukou': bool(item.get('parsed_hukou', False)),
                'hukou_keywords': '京户' if item.get('parsed_hukou') else '',
                'has_house': bool(item.get('parsed_house', False)),
                'house_keywords': '有房' if item.get('parsed_house') else '',
                'has_education': bool(item.get('parsed_education', False)),
                'education_keywords': item.get('parsed_education', ''),
                'ocr_confidence': item.get('ocr_confidence', 0.95),
                'ocr_corrections': ''
            })
        
        return pd.DataFrame(application_data)
    
    @staticmethod
    def get_available_data_sources():
        data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            '..', 'data'
        )
        
        sources = []
        if os.path.exists(data_dir):
            for f in os.listdir(data_dir):
                if f.endswith('.csv') or f.endswith('.json'):
                    sources.append({
                        'filename': f,
                        'type': 'csv' if f.endswith('.csv') else 'json',
                        'size': os.path.getsize(os.path.join(data_dir, f)),
                        'modified': datetime.fromtimestamp(
                            os.path.getmtime(os.path.join(data_dir, f))
                        ).strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        return sorted(sources, key=lambda x: x['modified'], reverse=True)
