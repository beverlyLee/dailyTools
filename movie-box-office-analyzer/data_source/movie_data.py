import requests
import json
import random
from datetime import datetime, timedelta

class MovieDataSource:
    def __init__(self):
        self.movies_db = self._init_movies_database()
    
    def _init_movies_database(self):
        return [
            {
                'id': 1,
                'name': '流浪地球3',
                'box_office': 458000,
                'release_date': '2025-01-28',
                'rating': 8.7,
                'director': '郭帆',
                'actors': '吴京, 刘德华, 李雪健',
                'genre': '科幻, 冒险',
                'duration': 173,
                'summary': '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。然而宇宙之路危机四伏，为了拯救地球，流浪地球时代的年轻人再次挺身而出。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2906818690.jpg'
            },
            {
                'id': 2,
                'name': '满江红2',
                'box_office': 325000,
                'release_date': '2025-01-25',
                'rating': 7.8,
                'director': '张艺谋',
                'actors': '沈腾, 易烊千玺, 张译',
                'genre': '悬疑, 喜剧',
                'duration': 159,
                'summary': '南宋绍兴年间，秦桧率兵与金国会谈前夕，神秘案件再次发生。一群小人物为了民族大义，再次卷入惊天阴谋之中。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2886819023.jpg'
            },
            {
                'id': 3,
                'name': '封神第三部',
                'box_office': 289000,
                'release_date': '2025-01-20',
                'rating': 8.5,
                'director': '乌尔善',
                'actors': '费翔, 黄渤, 于适',
                'genre': '神话, 动作',
                'duration': 148,
                'summary': '商纣王殷寿暴政日盛，武王姬发率诸侯伐纣。诛仙阵万仙来朝，封神榜尘埃落定。一场旷古烁今的神魔大战即将上演。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2897654321.jpg'
            },
            {
                'id': 4,
                'name': '唐人街探案4',
                'box_office': 215000,
                'release_date': '2025-01-22',
                'rating': 7.2,
                'director': '陈思诚',
                'actors': '王宝强, 刘昊然, 妻夫木聪',
                'genre': '喜剧, 悬疑',
                'duration': 136,
                'summary': '唐仁秦风被卷进伦敦一起离奇案件。Q组织再次现身，唐探宇宙迎来终极对决。真相背后隐藏着更大的阴谋。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2876543210.jpg'
            },
            {
                'id': 5,
                'name': '热辣滚烫2',
                'box_office': 198000,
                'release_date': '2025-01-30',
                'rating': 7.5,
                'director': '贾玲',
                'actors': '贾玲, 雷佳音, 张小斐',
                'genre': '喜剧, 励志',
                'duration': 128,
                'summary': '乐莹成为职业拳击手后，面临新的人生挑战。在擂台上的输赢之外，她找到了更重要的人生意义。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2912345678.jpg'
            },
            {
                'id': 6,
                'name': '哪吒之魔童闹海',
                'box_office': 520000,
                'release_date': '2025-02-01',
                'rating': 8.9,
                'director': '饺子',
                'actors': '吕艳婷, 囧森瑟夫, 瀚墨',
                'genre': '动画, 奇幻',
                'duration': 110,
                'summary': '哪吒重生后与敖丙结为挚友。东海龙宫暗流涌动，两人携手揭开龙族千年秘密，开启一场震撼的海底冒险。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2901234567.jpg'
            },
            {
                'id': 7,
                'name': '飞驰人生3',
                'box_office': 156000,
                'release_date': '2025-02-05',
                'rating': 7.6,
                'director': '韩寒',
                'actors': '沈腾, 尹正, 张本煜',
                'genre': '喜剧, 运动',
                'duration': 118,
                'summary': '张驰转型成为车队经理，培养新生代赛车手。在事业与家庭的平衡中，他重新理解了赛车精神的真谛。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2889876543.jpg'
            },
            {
                'id': 8,
                'name': '熊出没·重返未来',
                'box_office': 142000,
                'release_date': '2025-02-01',
                'rating': 6.8,
                'director': '林汇达',
                'actors': '张伟, 谭笑, 张秉君',
                'genre': '动画, 冒险',
                'duration': 98,
                'summary': '熊大熊二光头强意外穿越到未来世界，在科技高度发达的时代展开爆笑冒险，守护人与自然的和谐共处。',
                'poster': 'https://img9.doubanio.com/view/photo/l_ratio_poster/public/p2918765432.jpg'
            }
        ]
    
    def get_now_playing_movies(self):
        return self.movies_db
    
    def get_movie_detail(self, movie_id):
        for movie in self.movies_db:
            if movie['id'] == movie_id:
                return movie
        return None
    
    def get_box_office_trend(self, movie_id, days=30):
        movie = self.get_movie_detail(movie_id)
        if not movie:
            return []
        
        total_box = movie['box_office']
        base_daily = total_box / days
        
        trend_data = []
        start_date = datetime.now() - timedelta(days=days)
        random.seed(movie_id)
        
        raw_values = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            week_factor = 1.0 + 0.3 * (1 if current_date.weekday() >= 5 else 0)
            time_decay = 1.0 - 0.4 * (i / days)
            random_factor = 0.85 + random.random() * 0.3
            raw_value = base_daily * week_factor * time_decay * random_factor
            raw_values.append(max(100, raw_value))
        
        raw_total = sum(raw_values)
        scale_factor = total_box / raw_total
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            scaled_box = int(raw_values[i] * scale_factor)
            trend_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'box_office': scaled_box
            })
        
        final_total = sum(d['box_office'] for d in trend_data)
        diff = total_box - final_total
        if diff != 0 and len(trend_data) > 0:
            trend_data[-1]['box_office'] += diff
        
        return trend_data
    
    def search_movie_online(self, movie_name):
        try:
            search_url = f"https://api.douban.com/v2/movie/search?q={movie_name}"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            
            response = requests.get(search_url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('subjects'):
                    return data['subjects'][0]
            return None
        except Exception as e:
            print(f"搜索电影信息失败: {e}")
            return None
