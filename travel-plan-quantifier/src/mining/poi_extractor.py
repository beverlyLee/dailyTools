import jieba
import jieba.posseg as pseg
import re
from typing import List, Dict, Set

class PoiExtractor:
    def __init__(self):
        self.poi_database = {
            '北京': {
                '天安门': {'lng': 116.403874, 'lat': 39.914885, 'duration': 60, 'category': '地标'},
                '故宫': {'lng': 116.397027, 'lat': 39.917926, 'duration': 180, 'category': '历史古迹'},
                '长城': {'lng': 116.078904, 'lat': 40.361755, 'duration': 240, 'category': '历史古迹'},
                '颐和园': {'lng': 116.276328, 'lat': 39.999905, 'duration': 180, 'category': '园林'},
                '圆明园': {'lng': 116.308176, 'lat': 40.009904, 'duration': 120, 'category': '历史古迹'},
                '天坛': {'lng': 116.410889, 'lat': 39.881949, 'duration': 120, 'category': '历史古迹'},
                '北海': {'lng': 116.390391, 'lat': 39.926585, 'duration': 90, 'category': '公园'},
                '什刹海': {'lng': 116.394879, 'lat': 39.937183, 'duration': 120, 'category': '文化街区'},
                '南锣鼓巷': {'lng': 116.403981, 'lat': 39.937182, 'duration': 90, 'category': '文化街区'},
                '798': {'lng': 116.496150, 'lat': 39.984739, 'duration': 180, 'category': '艺术区'},
                '三里屯': {'lng': 116.459128, 'lat': 39.932651, 'duration': 90, 'category': '商圈'},
                '王府井': {'lng': 116.410889, 'lat': 39.914885, 'duration': 90, 'category': '商圈'},
                '鸟巢': {'lng': 116.399930, 'lat': 39.992884, 'duration': 60, 'category': '地标'},
                '水立方': {'lng': 116.393143, 'lat': 39.991605, 'duration': 60, 'category': '地标'},
                '雍和宫': {'lng': 116.420920, 'lat': 39.944937, 'duration': 90, 'category': '宗教场所'},
                '恭王府': {'lng': 116.388672, 'lat': 39.936946, 'duration': 120, 'category': '历史古迹'},
                '景山': {'lng': 116.396831, 'lat': 39.924470, 'duration': 60, 'category': '公园'},
                '前门': {'lng': 116.401779, 'lat': 39.900350, 'duration': 90, 'category': '文化街区'},
                '大栅栏': {'lng': 116.397968, 'lat': 39.898937, 'duration': 60, 'category': '文化街区'},
                '西单': {'lng': 116.378430, 'lat': 39.913356, 'duration': 90, 'category': '商圈'},
                '国子监': {'lng': 116.415678, 'lat': 39.944367, 'duration': 60, 'category': '历史古迹'},
                '后海': {'lng': 116.394879, 'lat': 39.937183, 'duration': 120, 'category': '文化街区'},
            },
            '上海': {
                '外滩': {'lng': 121.490317, 'lat': 31.239135, 'duration': 90, 'category': '地标'},
                '豫园': {'lng': 121.495039, 'lat': 31.227329, 'duration': 120, 'category': '园林'},
                '南京路': {'lng': 121.478238, 'lat': 31.236568, 'duration': 120, 'category': '商圈'},
                '东方明珠': {'lng': 121.500733, 'lat': 31.240138, 'duration': 120, 'category': '地标'},
                '田子坊': {'lng': 121.473130, 'lat': 31.205930, 'duration': 90, 'category': '文化街区'},
                '新天地': {'lng': 121.476827, 'lat': 31.216836, 'duration': 90, 'category': '文化街区'},
                '静安寺': {'lng': 121.448026, 'lat': 31.223827, 'duration': 60, 'category': '宗教场所'},
            },
            '杭州': {
                '西湖': {'lng': 120.151745, 'lat': 30.244267, 'duration': 240, 'category': '自然景观'},
                '灵隐寺': {'lng': 120.103200, 'lat': 30.241600, 'duration': 120, 'category': '宗教场所'},
                '雷峰塔': {'lng': 120.148675, 'lat': 30.232367, 'duration': 60, 'category': '历史古迹'},
                '苏堤': {'lng': 120.139866, 'lat': 30.252524, 'duration': 120, 'category': '自然景观'},
            },
            '西安': {
                '兵马俑': {'lng': 109.278926, 'lat': 34.384789, 'duration': 180, 'category': '历史古迹'},
                '大雁塔': {'lng': 108.967814, 'lat': 34.218253, 'duration': 90, 'category': '历史古迹'},
                '钟楼': {'lng': 108.946963, 'lat': 34.259523, 'duration': 60, 'category': '历史古迹'},
                '回民街': {'lng': 108.948024, 'lat': 34.260523, 'duration': 90, 'category': '美食街'},
            }
        }
        self._init_jieba()

    def _init_jieba(self):
        for city, pois in self.poi_database.items():
            for poi_name in pois.keys():
                jieba.add_word(poi_name)

    def get_city_pois(self, city: str, days: int = 3) -> List[str]:
        pois_per_day = 4
        total_pois = days * pois_per_day
        
        city = city.replace('市', '').replace('县', '')
        
        if city in self.poi_database:
            pois = list(self.poi_database[city].keys())[:total_pois]
        else:
            pois = list(self.poi_database['北京'].keys())[:total_pois]
        
        return pois

    def enrich_poi_with_location(self, poi_names: List[str], city: str) -> List[Dict]:
        result = []
        city_data = self.poi_database.get(city, self.poi_database['北京'])
        
        for poi_name in poi_names:
            poi_info = city_data.get(poi_name)
            if not poi_info:
                for name, info in city_data.items():
                    if poi_name in name or name in poi_name:
                        poi_info = info
                        break
            if not poi_info:
                poi_info = {'lng': 116.403874, 'lat': 39.914885, 'duration': 60, 'category': '其他'}
            
            result.append({
                'name': poi_name,
                'lng': poi_info['lng'],
                'lat': poi_info['lat'],
                'duration': poi_info.get('duration', 60),
                'category': poi_info.get('category', '其他')
            })
        
        return result

    def extract_from_text(self, text: str, city: str = None) -> List[Dict]:
        pois = []
        seen = set()
        
        words = pseg.cut(text)
        
        for word, flag in words:
            if flag in ['ns', 'nsf', 'nt'] and len(word) >= 2:
                if word not in seen:
                    seen.add(word)
                    pois.append({
                        'name': word,
                        'source': 'jieba_ner',
                        'confidence': 0.7
                    })
        
        if city and city in self.poi_database:
            for keyword in self.poi_database[city].keys():
                if keyword in text and keyword not in seen:
                    seen.add(keyword)
                    pois.append({
                        'name': keyword,
                        'source': 'city_keyword',
                        'confidence': 0.9
                    })
        
        return sorted(pois, key=lambda x: x['confidence'], reverse=True)
