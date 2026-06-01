import os
import requests
from typing import List, Dict

class SocialDataCollector:
    PLATFORMS = {
        'douyin': {
            'name': '抖音',
            'icon': '🎵',
            'description': '抖音宠物话题热榜数据'
        },
        'weibo': {
            'name': '微博',
            'icon': '📢',
            'description': '微博宠物话题讨论数据'
        },
        'bilibili': {
            'name': 'B站',
            'icon': '📺',
            'description': '哔哩哔哩宠物区热门视频数据'
        },
        'xiaohongshu': {
            'name': '小红书',
            'icon': '📕',
            'description': '小红书宠物笔记数据（备用）'
        }
    }

    def __init__(self):
        self.api_key = os.getenv('SOCIAL_API_KEY', '')
        self.api_base_url = os.getenv('SOCIAL_API_URL', '')
        
        self._init_mock_data()
    
    def _init_mock_data(self):
        self.mock_posts = {
            'douyin': [
                {
                    'id': 'dy_001',
                    'platform': 'douyin',
                    'platform_name': '抖音',
                    'author': '铲屎官日记',
                    'title': '布偶猫真的太粘人了！每天回家都要抱抱',
                    'content': '我家布偶猫年糕真的太粘人了，每天下班开门第一件事就是蹭腿要抱抱！养布偶的铲屎官们是不是都有同样的体验？#布偶猫 #铲屎官的日常',
                    'likes': 125800,
                    'comments': 3256,
                    'shares': 1234,
                    'brands': [],
                    'category': 'cats',
                    'publish_time': '2024-05-18'
                },
                {
                    'id': 'dy_002',
                    'platform': 'douyin',
                    'platform_name': '抖音',
                    'author': '宠物美食家',
                    'title': '麦富迪这款猫粮我家猫主子太爱吃了！',
                    'content': '给我家主子换了麦富迪的鲜肉猫粮，第一次见它吃这么香！配料表很干净，都是鲜肉，推荐给各位铲屎官～#猫粮推荐 #麦富迪 #养猫好物',
                    'likes': 89500,
                    'comments': 2180,
                    'shares': 890,
                    'brands': ['麦富迪'],
                    'category': 'food',
                    'publish_time': '2024-05-17'
                },
                {
                    'id': 'dy_003',
                    'platform': 'douyin',
                    'platform_name': '抖音',
                    'author': '宠物医生小李',
                    'title': '猫咪驱虫全攻略！新手必看',
                    'content': '很多铲屎官问我猫咪驱虫的问题，今天统一给大家讲一下：体内外驱虫多久一次？什么牌子好？大宠爱和海乐妙怎么选？#宠物驱虫 #猫咪健康 #养宠知识',
                    'likes': 156200,
                    'comments': 5680,
                    'shares': 2340,
                    'brands': ['大宠爱', '海乐妙'],
                    'category': 'medical',
                    'publish_time': '2024-05-16'
                },
                {
                    'id': 'dy_004',
                    'platform': 'douyin',
                    'platform_name': '抖音',
                    'author': '二哈不拆家',
                    'title': '我家二哈居然学会了拆快递！',
                    'content': '这狗现在成精了，每天最期待的就是拆快递，比我还积极！不过今天的pidan猫砂确实不错，推荐～#二哈 #宠物用品 #猫砂',
                    'likes': 234500,
                    'comments': 8920,
                    'shares': 3450,
                    'brands': ['pidan'],
                    'category': 'supplies',
                    'publish_time': '2024-05-15'
                },
                {
                    'id': 'dy_005',
                    'platform': 'douyin',
                    'platform_name': '抖音',
                    'author': '烘焙粮测评',
                    'title': '高爷家烘焙粮真实测评来了！',
                    'content': '终于等到高爷家这款烘焙粮的大货了，今天给大家做个真实测评！含肉量90%，颗粒不油腻，我家猫超爱吃～#高爷家 #烘焙粮 #猫粮测评',
                    'likes': 67800,
                    'comments': 1560,
                    'shares': 680,
                    'brands': ['高爷家'],
                    'category': 'food',
                    'publish_time': '2024-05-14'
                }
            ],
            'weibo': [
                {
                    'id': 'wb_001',
                    'platform': 'weibo',
                    'platform_name': '微博',
                    'author': '萌宠那些事',
                    'title': '#国产猫粮崛起# 伯纳天纯新品体验',
                    'content': '最近试了伯纳天纯的新品冻干猫粮，适口性真的不错！我家挑食怪都爱吃！支持国产！#伯纳天纯 #国产猫粮 #宠物',
                    'likes': 45600,
                    'comments': 1230,
                    'shares': 560,
                    'brands': ['伯纳天纯'],
                    'category': 'food',
                    'publish_time': '2024-05-18'
                },
                {
                    'id': 'wb_002',
                    'platform': 'weibo',
                    'platform_name': '微博',
                    'author': '宠物博主大V',
                    'title': '诚实一口猫粮半年使用反馈',
                    'content': '给大家反馈一下诚实一口猫粮用了半年的感受：价格亲民，配方透明，猫咪长得很结实～性价比之王！#诚实一口 #养猫 #猫粮',
                    'likes': 32400,
                    'comments': 890,
                    'shares': 420,
                    'brands': ['诚实一口'],
                    'category': 'food',
                    'publish_time': '2024-05-17'
                },
                {
                    'id': 'wb_003',
                    'platform': 'weibo',
                    'platform_name': '微博',
                    'author': '宠物健康频道',
                    'title': '#宠物疫苗# 这些知识你必须知道',
                    'content': '宠物疫苗怎么打？打哪些？多久打一次？今天给大家详细科普一下疫苗的知识，建议收藏！#宠物健康 #养宠攻略',
                    'likes': 78900,
                    'comments': 2340,
                    'shares': 1230,
                    'brands': [],
                    'category': 'medical',
                    'publish_time': '2024-05-16'
                },
                {
                    'id': 'wb_004',
                    'platform': 'weibo',
                    'platform_name': '微博',
                    'author': '宠物用品测评',
                    'title': '小佩智能喂食器真实使用体验',
                    'content': '用了小佩的智能喂食器三个月，来给大家聊聊真实体验。优点：定时定量、APP远程控制、颜值高。缺点：偶尔会有卡粮情况...#小佩 #宠物用品 #智能喂食器',
                    'likes': 28900,
                    'comments': 780,
                    'shares': 340,
                    'brands': ['小佩'],
                    'category': 'supplies',
                    'publish_time': '2024-05-15'
                }
            ],
            'bilibili': [
                {
                    'id': 'bili_001',
                    'platform': 'bilibili',
                    'platform_name': 'B站',
                    'author': '宠物测评UP主',
                    'title': '【猫粮横评】5款热门猫粮真实测评！渴望/百利/蓝氏谁更值得买？',
                    'content': '本期视频给大家带来5款热门猫粮的横评：渴望鸡、百利高蛋白、蓝氏猎鸟乳鸽...到底谁更值得买？看完不踩坑！',
                    'likes': 156000,
                    'comments': 8900,
                    'shares': 4500,
                    'brands': ['渴望', '百利', '蓝氏'],
                    'category': 'food',
                    'publish_time': '2024-05-18',
                    'video_duration': '15:32'
                },
                {
                    'id': 'bili_002',
                    'platform': 'bilibili',
                    'platform_name': 'B站',
                    'author': '养宠干货分享',
                    'title': '【干货】猫咪驱虫药怎么选？内外驱虫全攻略！',
                    'content': '新手铲屎官必看！拜宠清、福来恩、大宠爱...热门驱虫药对比分析，帮你选对不选贵！',
                    'likes': 98700,
                    'comments': 5600,
                    'shares': 3200,
                    'brands': ['拜宠清', '福来恩', '大宠爱'],
                    'category': 'medical',
                    'publish_time': '2024-05-17',
                    'video_duration': '12:45'
                },
                {
                    'id': 'bili_003',
                    'platform': 'bilibili',
                    'platform_name': 'B站',
                    'author': '萌宠生活家',
                    'title': '【养猫好物】盘点那些提升养宠幸福感的用品！',
                    'content': '今天给大家推荐一些提升养猫幸福感的好物：宠幸猫砂盆、pidan猫砂、各种玩具...视频最后有抽奖哦！',
                    'likes': 76500,
                    'comments': 3400,
                    'shares': 2100,
                    'brands': ['宠幸', 'pidan'],
                    'category': 'supplies',
                    'publish_time': '2024-05-16',
                    'video_duration': '08:20'
                }
            ]
        }
        
        self.mock_trends = {
            'hot_topics': [
                {'name': '#国产猫粮崛起#', 'views': '2.3亿', 'discussions': '18.6万', 'platform': 'all'},
                {'name': '#猫咪驱虫攻略#', 'views': '1.8亿', 'discussions': '12.3万', 'platform': 'all'},
                {'name': '#宠物用品推荐#', 'views': '1.5亿', 'discussions': '9.8万', 'platform': 'all'},
                {'name': '#新手养猫攻略#', 'views': '3.2亿', 'discussions': '25.6万', 'platform': 'all'},
                {'name': '#养狗日常#', 'views': '2.8亿', 'discussions': '21.2万', 'platform': 'all'}
            ],
            'brand_mentions': {
                '麦富迪': 125600,
                '伯纳天纯': 98700,
                '诚实一口': 87600,
                '渴望': 76500,
                '百利': 65400,
                '蓝氏': 54300,
                '高爷家': 43200
            },
            'platform_stats': {
                'douyin': {'total_posts': 1250000, 'total_views': '58.2亿'},
                'weibo': {'total_posts': 890000, 'total_views': '42.6亿'},
                'bilibili': {'total_posts': 340000, 'total_views': '18.9亿'}
            }
        }
    
    def get_social_posts(self, platform: str = 'all', count: int = 10) -> List[Dict]:
        if platform == 'all':
            all_posts = []
            for posts in self.mock_posts.values():
                all_posts.extend(posts)
            return all_posts[:count]
        elif platform in self.mock_posts:
            return self.mock_posts[platform][:count]
        else:
            return []
    
    def get_social_trends(self, platform: str = 'all') -> Dict:
        return self.mock_trends
    
    def get_data_source_info(self) -> Dict:
        return {
            'description': '社交媒体数据来自抖音、微博、B站等开放平台宠物话题热榜',
            'platforms': list(self.PLATFORMS.values()),
            'coverage': '覆盖宠物食品、医疗、用品等全品类话题'
        }
    
    def extract_brands_from_content(self, content: str) -> List[str]:
        brands_keywords = [
            '麦富迪', '伯纳天纯', '比乐', '卫仕', '网易严选', '高爷家',
            '诚实一口', '蓝氏', '有鱼', '阿飞和巴弟', '醇粹', '帕特诺尔',
            '渴望', '爱肯拿', '百利', '纽翠斯', '巅峰', 'K9', '法米娜',
            'NOW', 'GO', '素力高', '纽顿', '荒野盛宴',
            '大宠爱', '海乐妙', '拜宠清', '福来恩', '犬心保',
            'pidan', '小佩', '霍曼', '鸟语花香', '宠幸'
        ]
        
        found = []
        for brand in brands_keywords:
            if brand in content:
                found.append(brand)
        return found
