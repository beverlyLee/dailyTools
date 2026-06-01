from typing import List, Dict
from collections import defaultdict

class HairlineAnalyzer:
    """发际线焦虑分析器 - 计算不同编程语言开发者的脱发提及概率"""
    
    def __init__(self):
        pass
    
    def calculate_hairline_risk(self, analyzed_posts: List[Dict]) -> Dict[str, Dict]:
        """
        计算每种编程语言的发际线风险指数
        
        Args:
            analyzed_posts: 经过实体识别分析的帖子列表
            
        Returns:
            各语言风险统计字典
        """
        language_stats = defaultdict(lambda: {
            'total_posts': 0,
            'hair_mention_posts': 0,
            'risk_score': 0.0
        })
        
        for post in analyzed_posts:
            languages = post.get('detected_languages', [])
            has_hair = post.get('has_hair_mention', False)
            
            for lang in languages:
                language_stats[lang]['total_posts'] += 1
                if has_hair:
                    language_stats[lang]['hair_mention_posts'] += 1
        
        for lang, stats in language_stats.items():
            if stats['total_posts'] > 0:
                stats['risk_score'] = round(
                    (stats['hair_mention_posts'] / stats['total_posts']) * 100, 
                    2
                )
        
        return dict(language_stats)
    
    def get_ranking(self, stats: Dict[str, Dict], min_posts: int = 1) -> List[Dict]:
        """
        获取按风险分数排序的语言排名
        
        Args:
            stats: 语言风险统计字典
            min_posts: 最少帖子数阈值
            
        Returns:
            排序后的语言排名列表
        """
        ranking = [
            {
                'language': lang,
                'total_posts': data['total_posts'],
                'hair_mention_posts': data['hair_mention_posts'],
                'risk_score': data['risk_score']
            }
            for lang, data in stats.items()
            if data['total_posts'] >= min_posts
        ]
        
        ranking.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return ranking
    
    def generate_mock_data(self) -> Dict[str, Dict]:
        """
        生成模拟数据，用于演示和测试
        
        Returns:
            模拟的语言风险统计数据
        """
        return {
            'PHP': {
                'total_posts': 156,
                'hair_mention_posts': 71,
                'risk_score': 45.51
            },
            'Java': {
                'total_posts': 203,
                'hair_mention_posts': 76,
                'risk_score': 37.44
            },
            'Go': {
                'total_posts': 118,
                'hair_mention_posts': 29,
                'risk_score': 24.58
            },
            'Python': {
                'total_posts': 175,
                'hair_mention_posts': 41,
                'risk_score': 23.43
            },
            'JavaScript': {
                'total_posts': 162,
                'hair_mention_posts': 35,
                'risk_score': 21.60
            }
        }
    
    def get_summary(self, stats: Dict[str, Dict]) -> Dict:
        """
        获取分析摘要
        
        Args:
            stats: 语言风险统计字典
            
        Returns:
            分析摘要信息
        """
        total_posts = sum(data['total_posts'] for data in stats.values())
        total_hair_posts = sum(data['hair_mention_posts'] for data in stats.values())
        avg_risk = round(total_hair_posts / total_posts * 100, 2) if total_posts > 0 else 0
        
        ranking = self.get_ranking(stats)
        highest_risk = ranking[0] if ranking else None
        lowest_risk = ranking[-1] if ranking else None
        
        return {
            'total_languages': len(stats),
            'total_posts': total_posts,
            'total_hair_mention_posts': total_hair_posts,
            'average_risk_score': avg_risk,
            'highest_risk_language': highest_risk,
            'lowest_risk_language': lowest_risk
        }
