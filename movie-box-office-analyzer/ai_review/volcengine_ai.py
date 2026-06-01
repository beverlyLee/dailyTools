import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

class VolcengineAI:
    def __init__(self):
        self.api_key = os.getenv('VOLCENGINE_API_KEY', '')
        self.endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
        self.model = 'doubao-seed-2-0-code-preview-260215'
        self.max_retries = 3
        self.retry_delay = 2
        self.timeout = 30
    
    def generate_movie_review(self, movie_name, rating, box_office, genre, director='', summary=''):
        has_valid_api = self.api_key and self.api_key != 'your_api_key_here' and len(self.api_key) > 10
        
        box_office_yi = box_office / 10000
        
        prompt = f"""请作为专业影评人，根据以下电影信息，生成一段100字左右的精彩影评：
电影名称：{movie_name}
豆瓣评分：{rating}分
累计票房：{box_office_yi:.1f}亿
电影类型：{genre}
导演：{director}
剧情简介：{summary}

要求：
1. 语言生动有感染力，适当使用emoji表情
2. 结合评分和票房数据进行评价
3. 突出电影的特点和亮点
4. 控制在80-120字之间"""
        
        if has_valid_api:
            result = self._call_api_with_retry(prompt)
            if result:
                return result
        
        return self._generate_fallback_review(movie_name, rating, box_office, genre)
    
    def _call_api_with_retry(self, prompt):
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        
        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'system', 
                    'content': '你是一位资深电影评论人，文笔生动幽默，善于用简洁有力的语言点评电影，能够结合票房和评分数据给出专业评价。'
                },
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 150,
            'temperature': 0.8
        }
        
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    self.endpoint, 
                    headers=headers, 
                    json=payload, 
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result['choices'][0]['message']['content'].strip()
                elif response.status_code >= 500:
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                        continue
                    return None
                else:
                    return None
                    
            except requests.exceptions.Timeout:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                return None
            except requests.exceptions.RequestException:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                return None
            except Exception:
                return None
        
        return None
    
    def _generate_fallback_review(self, movie_name, rating, box_office, genre):
        box_office_yi = box_office / 10000
        
        import random
        
        intro_emojis = ['🎬', '🌟', '📽️', '💫', '🎥']
        rating_comments = [
            f'凭借{rating}分的出色口碑',
            f'以{rating}分赢得观众青睐',
            f'在豆瓣斩获{rating}分高分'
        ]
        box_comments = [
            f'与{box_office_yi:.1f}亿票房成绩',
            f'创下{box_office_yi:.1f}亿票房佳绩',
            f'累计斩获{box_office_yi:.1f}亿票房'
        ]
        genre_comments = [
            f'在{genre}领域大放异彩！',
            f'成为{genre}类型的热门之作！',
            f'为{genre}影迷带来精彩体验！'
        ]
        
        quality_comments = {
            'excellent': [
                '制作精良、演技在线，堪称年度佳作，强烈推荐走进影院感受其魅力！',
                '无论是视觉效果还是叙事节奏都属上乘，绝对是不容错过的好片！'
            ],
            'good': [
                '整体质量上乘，各方面表现均衡，值得购票观影支持！',
                '导演功力扎实，演员表现出彩，是部值得一看的好电影！'
            ],
            'average': [
                '虽有瑕疵但亮点不少，适合闲暇时观看放松心情。',
                '整体表现中规中矩，作为娱乐片仍有可圈可点之处。'
            ],
            'below': [
                '期待后续作品能有更多突破，或许适合特定影迷群体。',
                '虽未达预期但仍有可取之处，期待主创团队未来进步。'
            ]
        }
        
        emoji = random.choice(intro_emojis)
        rating_cmt = random.choice(rating_comments)
        box_cmt = random.choice(box_comments)
        genre_cmt = random.choice(genre_comments)
        
        if rating >= 8.5:
            quality_cmt = random.choice(quality_comments['excellent'])
        elif rating >= 7.5:
            quality_cmt = random.choice(quality_comments['good'])
        elif rating >= 6.5:
            quality_cmt = random.choice(quality_comments['average'])
        else:
            quality_cmt = random.choice(quality_comments['below'])
        
        review = f'{emoji} 《{movie_name}》{rating_cmt}，{box_cmt}，{genre_cmt} {quality_cmt}'
        
        target_length = 80 + random.randint(-10, 20)
        if len(review) > target_length + 20:
            review = review[:target_length] + '...'
        
        return review
