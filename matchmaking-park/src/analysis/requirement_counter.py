import pandas as pd
from collections import Counter
from typing import Dict, List
from src.ocr.card_parser import CardParser


class RequirementCounter:
    def __init__(self):
        self.parser = CardParser(enable_ocr_simulation=False)
        
        self.fault_tolerance_map = {
            '京户': ['惊户', '京护', '惊护', '凉户', '京尸'],
            '有房': ['友房', '有方', '友方', '屋房'],
            '硕士': ['朔士', '硕土', '顾士', '顾土'],
            '博士': ['薄士', '博土', '薄土'],
            '本科': ['笨科', '木科', '棵科', '料科']
        }
    
    def _fuzzy_contains(self, text: str, keyword: str) -> bool:
        if keyword in text:
            return True
        
        if keyword in self.fault_tolerance_map:
            for error_variant in self.fault_tolerance_map[keyword]:
                if error_variant in text:
                    return True
        
        return False
    
    def count_by_city(self, df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
        city_stats = {}
        
        for city in df['city'].unique():
            city_df = df[df['city'] == city]
            keywords = []
            
            for content in city_df['content']:
                keywords.extend(self.parser.extract_all_keywords(content))
            
            keyword_counts = Counter(keywords)
            city_stats[city] = dict(keyword_counts)
        
        return city_stats
    
    def count_hukou(self, df: pd.DataFrame) -> Dict[str, int]:
        hukou_counts = {}
        for city in df['city'].unique():
            city_df = df[df['city'] == city]
            hukou_count = 0
            for content in city_df['content']:
                if self._fuzzy_contains(content, '京户') or '户口' in content or '上海户口' in content:
                    hukou_count += 1
            hukou_counts[city] = hukou_count
        return hukou_counts
    
    def count_house(self, df: pd.DataFrame) -> Dict[str, int]:
        house_counts = {}
        for city in df['city'].unique():
            city_df = df[df['city'] == city]
            house_count = 0
            for content in city_df['content']:
                if self._fuzzy_contains(content, '有房') or '房产' in content:
                    house_count += 1
            house_counts[city] = house_count
        return house_counts
    
    def count_education(self, df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
        edu_counts = {}
        edu_levels = ['博士', '硕士', '本科']
        
        for city in df['city'].unique():
            city_df = df[df['city'] == city]
            city_edu = {level: 0 for level in edu_levels}
            
            for content in city_df['content']:
                for level in edu_levels:
                    if self._fuzzy_contains(content, level):
                        city_edu[level] += 1
            
            edu_counts[city] = city_edu
        
        return edu_counts
    
    def get_wordcloud_data(self, df: pd.DataFrame, city: str) -> Dict[str, int]:
        city_df = df[df['city'] == city]
        keywords = []
        
        for content in city_df['content']:
            keywords.extend(self.parser.extract_all_keywords(content))
        
        weighted_keywords = []
        for kw in keywords:
            if kw == '京户' and city == '北京':
                weighted_keywords.extend([kw] * 5)
            elif kw == '有房' and city == '上海':
                weighted_keywords.extend([kw] * 4)
            elif kw == '硕士':
                weighted_keywords.extend([kw] * 2)
            else:
                weighted_keywords.append(kw)
        
        return dict(Counter(weighted_keywords))
    
    def get_all_cities(self, df: pd.DataFrame) -> List[str]:
        return sorted(df['city'].unique().tolist())
