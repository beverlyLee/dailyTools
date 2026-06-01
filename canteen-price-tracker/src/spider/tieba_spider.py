import os
import sys
import time
import json
import re
from datetime import datetime
from typing import List, Dict, Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from bs4 import BeautifulSoup

from config import HEADERS, REQUEST_DELAY, MAX_RETRIES, TIMEOUT, KEYWORDS, DATA_DIR


class TiebaSpider:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.posts_data = []
        
    def _make_request(self, url: str) -> Optional[requests.Response]:
        for attempt in range(MAX_RETRIES):
            try:
                time.sleep(REQUEST_DELAY)
                response = self.session.get(url, timeout=TIMEOUT)
                response.raise_for_status()
                return response
            except Exception as e:
                print(f"请求失败 (尝试 {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt == MAX_RETRIES - 1:
                    return None
    
    def search_tieba(self, keyword: str, max_pages: int = 5) -> List[Dict]:
        posts = []
        for page in range(max_pages):
            pn = page * 50
            url = f"http://tieba.baidu.com/f/search/res?ie=utf-8&kw={keyword}&qw={keyword}&pn={pn + 1}"
            
            response = self._make_request(url)
            if not response:
                continue
                
            soup = BeautifulSoup(response.text, 'lxml')
            post_items = soup.find_all('div', class_='s_post')
            
            for item in post_items:
                try:
                    title_elem = item.find('a', class_='bluelink')
                    if not title_elem:
                        continue
                        
                    title = title_elem.get_text(strip=True)
                    post_url = 'http://tieba.baidu.com' + title_elem['href']
                    
                    forum_elem = item.find('a', class_='p_forum')
                    forum_name = forum_elem.get_text(strip=True) if forum_elem else ''
                    
                    content_elem = item.find('div', class_='p_content')
                    content = content_elem.get_text(strip=True) if content_elem else ''
                    
                    time_elem = item.find('font', class_='p_date')
                    post_time = time_elem.get_text(strip=True) if time_elem else ''
                    
                    post = {
                        'title': title,
                        'url': post_url,
                        'forum': forum_name,
                        'content': content,
                        'post_time': post_time,
                        'keyword': keyword,
                        'crawl_time': datetime.now().isoformat()
                    }
                    posts.append(post)
                    print(f"抓取帖子: {title[:30]}...")
                    
                except Exception as e:
                    print(f"解析帖子失败: {e}")
                    continue
        
        return posts
    
    def extract_price_info(self, text: str) -> Dict:
        price_info = {
            'has_price': False,
            'rice_price': None,
            'noodle_price': None,
            'other_price': None
        }
        
        rice_patterns = [
            r'盖饭.*?(\d+\.?\d*)',
            r'米饭.*?(\d+\.?\d*)',
            r'盒饭.*?(\d+\.?\d*)',
            r'套餐.*?(\d+\.?\d*)'
        ]
        
        noodle_patterns = [
            r'面.*?(\d+\.?\d*)',
            r'粉.*?(\d+\.?\d*)'
        ]
        
        for pattern in rice_patterns:
            match = re.search(pattern, text)
            if match:
                price = float(match.group(1))
                if 5 <= price <= 50:
                    price_info['rice_price'] = price
                    price_info['has_price'] = True
                    break
        
        for pattern in noodle_patterns:
            match = re.search(pattern, text)
            if match:
                price = float(match.group(1))
                if 5 <= price <= 50:
                    price_info['noodle_price'] = price
                    price_info['has_price'] = True
                    break
        
        return price_info
    
    def run_spider(self, keywords: List[str] = None, max_pages: int = 3) -> List[Dict]:
        if keywords is None:
            keywords = KEYWORDS
            
        all_posts = []
        
        for keyword in keywords:
            print(f"\n开始搜索关键词: {keyword}")
            posts = self.search_tieba(keyword, max_pages)
            all_posts.extend(posts)
            
            for post in posts:
                price_info = self.extract_price_info(post['title'] + post['content'])
                post.update(price_info)
        
        self.posts_data = all_posts
        print(f"\n共抓取 {len(all_posts)} 条帖子")
        return all_posts
    
    def save_data(self, filename: str = 'posts_data.json'):
        os.makedirs(DATA_DIR, exist_ok=True)
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.posts_data, f, ensure_ascii=False, indent=2)
        
        print(f"数据已保存到: {filepath}")
        return filepath


if __name__ == '__main__':
    spider = TiebaSpider()
    spider.run_spider(max_pages=2)
    spider.save_data()
