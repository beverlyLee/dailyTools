from celery_app import celery
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
import json
from config import config

@celery.task(bind=True, name='tasks.news_scraper.scrape_news')
def scrape_news(self, source_name=None):
    """
    爬取新闻数据的Celery任务
    """
    if source_name:
        sources = [s for s in config.NEWS_SOURCES if s['name'] == source_name]
    else:
        sources = config.NEWS_SOURCES
    
    results = []
    
    for source in sources:
        try:
            news_items = scrape_source(source)
            results.extend(news_items)
        except Exception as e:
            print(f"爬取 {source['name']} 失败: {str(e)}")
            continue
    
    return results

def scrape_source(source):
    """
    爬取单个新闻源
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(source['url'], headers=headers, timeout=10)
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        news_items = extract_news(soup, source)
        
        return news_items
        
    except Exception as e:
        print(f"请求 {source['url']} 失败: {str(e)}")
        return []

def extract_news(soup, source):
    """
    从网页中提取新闻信息
    """
    news_items = []
    
    patterns = [
        {'tag': 'a', 'attrs': {'href': re.compile(r'news|article|story')}},
        {'tag': 'div', 'attrs': {'class': re.compile(r'news|article|item')}},
        {'tag': 'li', 'attrs': {'class': re.compile(r'news|article|item')}},
    ]
    
    for pattern in patterns:
        elements = soup.find_all(pattern['tag'], pattern['attrs'])
        for element in elements[:20]:
            try:
                news = extract_news_item(element, source)
                if news and news['title']:
                    news_items.append(news)
            except:
                continue
    
    news_items = [dict(t) for t in {tuple(d.items()) for d in news_items}]
    
    return news_items

def extract_news_item(element, source):
    """
    提取单个新闻项
    """
    title = None
    link = None
    summary = None
    
    title_element = element.find('a')
    if title_element:
        title = title_element.get_text(strip=True)
        link = title_element.get('href', '')
    
    if not title:
        title = element.get_text(strip=True)
    
    if link and not link.startswith('http'):
        if link.startswith('/'):
            from urllib.parse import urljoin
            link = urljoin(source['url'], link)
        else:
            link = None
    
    if title and len(title) > 10:
        return {
            'title': title,
            'link': link,
            'source': source['name'],
            'source_type': source['type'],
            'scraped_time': datetime.now().isoformat(),
            'summary': summary
        }
    
    return None

@celery.task(bind=True, name='tasks.news_scraper.scrape_all_sources')
def scrape_all_sources(self):
    """
    爬取所有新闻源的定时任务
    """
    return scrape_news()

@celery.task(bind=True, name='tasks.news_scraper.store_news')
def store_news(self, news_items):
    """
    存储新闻到数据库
    """
    try:
        stored_count = 0
        for news in news_items:
            if 'sentiment' not in news:
                from tasks.sentiment_analysis import analyze_sentiment_task
                sentiment_result = analyze_sentiment_task(news.get('title', '') + ' ' + news.get('summary', ''))
                news.update(sentiment_result)
            
            stored_count += 1
        
        return {'stored': stored_count, 'total': len(news_items)}
        
    except Exception as e:
        print(f"存储新闻失败: {str(e)}")
        return {'stored': 0, 'error': str(e)}
