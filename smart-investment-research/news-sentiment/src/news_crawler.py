import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
import json
from urllib.parse import urljoin
from .config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsCrawler:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def crawl_all_sources(self):
        """
        爬取所有启用的新闻源
        """
        all_news = []
        
        for source in config.NEWS_SOURCES:
            if not source.get('enabled', True):
                continue
            
            try:
                logger.info(f"开始爬取: {source['name']}")
                news_items = self.crawl_source(source)
                all_news.extend(news_items)
                logger.info(f"完成爬取: {source['name']}, 获取 {len(news_items)} 条新闻")
            except Exception as e:
                logger.error(f"爬取 {source['name']} 失败: {str(e)}")
                continue
        
        return all_news
    
    def crawl_source(self, source):
        """
        爬取单个新闻源
        """
        news_items = []
        
        try:
            response = self.session.get(source['url'], timeout=15)
            response.encoding = self._detect_encoding(response)
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            news_items = self._extract_news(soup, source)
            
        except requests.RequestException as e:
            logger.error(f"请求 {source['url']} 失败: {str(e)}")
        
        return news_items
    
    def _detect_encoding(self, response):
        """
        检测网页编码
        """
        if response.encoding:
            return response.encoding
        
        from charset_normalizer import from_bytes
        result = from_bytes(response.content).best()
        return result.encoding if result else 'utf-8'
    
    def _extract_news(self, soup, source):
        """
        从网页中提取新闻信息
        """
        news_items = []
        seen_titles = set()
        
        extractors = [
            self._extract_from_news_tags,
            self._extract_from_article_tags,
            self._extract_from_list_items,
            self._extract_from_links,
        ]
        
        for extractor in extractors:
            items = extractor(soup, source)
            for item in items:
                title_key = item['title'][:50] if item['title'] else ''
                if title_key and title_key not in seen_titles:
                    seen_titles.add(title_key)
                    news_items.append(item)
            
            if len(news_items) >= 20:
                break
        
        return news_items[:20]
    
    def _extract_from_news_tags(self, soup, source):
        """
        从 news 标签提取新闻
        """
        items = []
        for news_tag in soup.find_all(['div', 'li', 'article'], class_=re.compile(r'news|article|item|list', re.I)):
            item = self._parse_news_element(news_tag, source)
            if item:
                items.append(item)
        return items
    
    def _extract_from_article_tags(self, soup, source):
        """
        从 article 标签提取新闻
        """
        items = []
        for article in soup.find_all('article'):
            item = self._parse_news_element(article, source)
            if item:
                items.append(item)
        return items
    
    def _extract_from_list_items(self, soup, source):
        """
        从列表项提取新闻
        """
        items = []
        for li in soup.find_all('li'):
            item = self._parse_news_element(li, source)
            if item:
                items.append(item)
        return items
    
    def _extract_from_links(self, soup, source):
        """
        从链接提取新闻
        """
        items = []
        for a in soup.find_all('a', href=True):
            href = a.get('href', '')
            text = a.get_text(strip=True)
            
            if self._is_news_link(href, text):
                item = {
                    'title': text,
                    'link': self._normalize_url(href, source['url']),
                    'source': source['name'],
                    'source_type': source['type'],
                    'crawl_time': datetime.now().isoformat(),
                    'summary': None
                }
                items.append(item)
        
        return items
    
    def _parse_news_element(self, element, source):
        """
        解析新闻元素
        """
        title = None
        link = None
        summary = None
        
        title_link = element.find('a', href=True)
        if title_link:
            title = title_link.get_text(strip=True)
            link = title_link.get('href', '')
        
        if not title:
            title = element.get_text(strip=True)
        
        if not title or len(title) < 10:
            return None
        
        link = self._normalize_url(link, source['url'])
        
        summary_element = element.find(['p', 'div', 'span'], class_=re.compile(r'summary|desc|intro', re.I))
        if summary_element:
            summary = summary_element.get_text(strip=True)
        
        return {
            'title': title,
            'link': link,
            'source': source['name'],
            'source_type': source['type'],
            'crawl_time': datetime.now().isoformat(),
            'summary': summary
        }
    
    def _is_news_link(self, href, text):
        """
        判断是否为新闻链接
        """
        if not text or len(text) < 10:
            return False
        
        news_patterns = [
            r'news', r'article', r'story', r'content', r'detail',
            r'\d{4}-\d{2}-\d{2}', r'\d{8}'
        ]
        
        for pattern in news_patterns:
            if re.search(pattern, href, re.I):
                return True
        
        return False
    
    def _normalize_url(self, url, base_url):
        """
        标准化URL
        """
        if not url:
            return None
        
        if url.startswith('http://') or url.startswith('https://'):
            return url
        
        if url.startswith('//'):
            return 'https:' + url
        
        if url.startswith('/'):
            return urljoin(base_url, url)
        
        return urljoin(base_url, url)
    
    def crawl_article_detail(self, url):
        """
        爬取文章详情
        """
        if not url:
            return None
        
        try:
            response = self.session.get(url, timeout=15)
            response.encoding = self._detect_encoding(response)
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            content = self._extract_article_content(soup)
            publish_time = self._extract_publish_time(soup)
            author = self._extract_author(soup)
            
            return {
                'content': content,
                'publish_time': publish_time,
                'author': author
            }
            
        except Exception as e:
            logger.error(f"爬取文章详情失败: {str(e)}")
            return None
    
    def _extract_article_content(self, soup):
        """
        提取文章内容
        """
        content_selectors = [
            {'name': 'div', 'attrs': {'class': re.compile(r'content|article-body|article-content', re.I)}},
            {'name': 'div', 'attrs': {'id': re.compile(r'content|article', re.I)}},
            {'name': 'article', 'attrs': {}},
            {'name': 'div', 'attrs': {'class': re.compile(r'post|news-detail', re.I)}},
        ]
        
        for selector in content_selectors:
            element = soup.find(selector['name'], selector['attrs'])
            if element:
                for unwanted in element.find_all(['script', 'style', 'nav', 'aside', 'footer']):
                    unwanted.decompose()
                
                paragraphs = element.find_all('p')
                if paragraphs:
                    content = '\n'.join([p.get_text(strip=True) for p in paragraphs])
                    if len(content) > 100:
                        return content
                
                text = element.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    return text
        
        return None
    
    def _extract_publish_time(self, soup):
        """
        提取发布时间
        """
        time_patterns = [
            r'\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}(:\d{2})?',
            r'\d{4}-\d{2}-\d{2}\s*\d{1,2}:\d{2}(:\d{2})?',
            r'\d{4}/\d{2}/\d{2}\s*\d{1,2}:\d{2}(:\d{2})?',
        ]
        
        text = soup.get_text()
        
        for pattern in time_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group()
        
        time_element = soup.find(['span', 'div', 'time'], class_=re.compile(r'time|date|publish', re.I))
        if time_element:
            return time_element.get_text(strip=True)
        
        return None
    
    def _extract_author(self, soup):
        """
        提取作者
        """
        author_element = soup.find(['span', 'div', 'a'], class_=re.compile(r'author|source|editor', re.I))
        if author_element:
            return author_element.get_text(strip=True)
        
        return None

crawler = NewsCrawler()
