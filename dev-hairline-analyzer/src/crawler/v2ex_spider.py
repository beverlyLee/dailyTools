import requests
import time
from typing import List, Dict, Optional

class V2EXSpider:
    """V2EX爬虫 - 抓取包含头发相关关键词的帖子"""
    
    BASE_URL = "https://www.v2ex.com/api"
    KEYWORDS = ["头发", "发际线", "脱发", "秃头", "谢顶", "掉发"]
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        })
    
    def search_posts(self, keywords: Optional[List[str]] = None, limit: int = 50) -> List[Dict]:
        """
        搜索包含指定关键词的帖子
        
        Args:
            keywords: 关键词列表，默认为头发相关关键词
            limit: 每个关键词最多返回的帖子数
        
        Returns:
            帖子列表
        """
        if keywords is None:
            keywords = self.KEYWORDS
        
        all_posts = []
        seen_ids = set()
        
        for keyword in keywords:
            try:
                response = self.session.get(
                    f"{self.BASE_URL}/topics/search.json",
                    params={'q': keyword},
                    timeout=10
                )
                
                if response.status_code == 200:
                    posts = response.json()
                    for post in posts[:limit]:
                        post_id = post.get('id')
                        if post_id and post_id not in seen_ids:
                            seen_ids.add(post_id)
                            all_posts.append({
                                'id': post_id,
                                'title': post.get('title', ''),
                                'content': post.get('content', ''),
                                'url': post.get('url', ''),
                                'author': post.get('member', {}).get('username', 'anonymous'),
                                'created': post.get('created', 0),
                                'replies': post.get('replies', 0),
                                'source': 'v2ex',
                                'matched_keyword': keyword
                            })
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"搜索关键词 '{keyword}' 时出错: {str(e)}")
                continue
        
        return all_posts
    
    def get_hot_topics(self) -> List[Dict]:
        """
        获取热门话题
        
        Returns:
            热门帖子列表
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/topics/hot.json",
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
                
        except Exception as e:
            print(f"获取热门话题时出错: {str(e)}")
        
        return []
    
    def get_recent_posts(self) -> List[Dict]:
        """
        获取最新帖子
        
        Returns:
            最新帖子列表
        """
        try:
            response = self.session.get(
                f"{self.BASE_URL}/topics/latest.json",
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
                
        except Exception as e:
            print(f"获取最新帖子时出错: {str(e)}")
        
        return []
