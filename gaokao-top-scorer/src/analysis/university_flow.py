import pandas as pd
from typing import Dict, List, Tuple
from collections import defaultdict


class UniversityFlowAnalyzer:
    def __init__(self, data: pd.DataFrame):
        self.data = data
        self.province_coords = {
            '北京': (116.4074, 39.9042),
            '上海': (121.4737, 31.2304),
            '天津': (117.2009, 39.0842),
            '重庆': (106.5516, 29.5630),
            '河北': (114.5149, 38.0423),
            '河南': (113.6254, 34.7466),
            '山东': (117.0009, 36.6758),
            '江苏': (118.7632, 32.0617),
            '浙江': (120.1536, 30.2874),
            '广东': (113.2644, 23.1291),
            '湖北': (114.3054, 30.5931),
            '湖南': (112.9823, 28.1941),
            '四川': (104.0657, 30.6598),
            '陕西': (108.9542, 34.2655),
            '安徽': (117.2857, 31.8612),
            '福建': (119.2965, 26.0745),
            '江西': (115.8922, 28.6765),
            '辽宁': (123.4328, 41.8045),
            '吉林': (125.3235, 43.8171),
            '黑龙江': (126.5349, 45.8038),
            '山西': (112.5627, 37.8706),
            '甘肃': (103.8343, 36.0611),
            '青海': (101.7802, 36.6171),
            '海南': (110.3312, 20.0319),
            '云南': (102.7100, 25.0406),
            '贵州': (106.7135, 26.5783),
            '内蒙古': (111.7492, 40.8426),
            '广西': (108.3200, 22.8240),
            '西藏': (91.1322, 29.6604),
            '宁夏': (106.2731, 38.4682),
            '新疆': (87.6168, 43.8267),
        }
        
        self.university_coords = {
            '清华大学': (116.3264, 39.9996),
            '北京大学': (116.3106, 39.9929),
            '复旦大学': (121.5036, 31.2904),
            '上海交通大学': (121.4366, 31.0315),
            '浙江大学': (120.1264, 30.2741),
            '南京大学': (118.7802, 32.0562),
            '中国科学技术大学': (117.2533, 31.8370),
            '武汉大学': (114.3621, 30.5386),
            '华中科技大学': (114.4139, 30.5108),
            '中山大学': (113.2991, 23.1321),
        }

    def get_top_universities(self, top_n: int = 10) -> List[Tuple[str, int]]:
        counts = self.data['school'].value_counts().head(top_n)
        return list(zip(counts.index, counts.values))

    def get_province_outflow(self, target_schools: List[str] = None) -> Dict[str, int]:
        if target_schools is None:
            target_schools = ['清华大学', '北京大学']
        
        filtered = self.data[self.data['school'].isin(target_schools)]
        province_counts = filtered['province'].value_counts()
        return province_counts.to_dict()

    def get_flow_data(self, target_schools: List[str] = None) -> List[Dict]:
        if target_schools is None:
            target_schools = ['清华大学', '北京大学']
        
        filtered = self.data[self.data['school'].isin(target_schools)]
        flows = []
        
        for (province, school), group in filtered.groupby(['province', 'school']):
            count = len(group)
            if province in self.province_coords and school in self.university_coords:
                prov_lon, prov_lat = self.province_coords[province]
                uni_lon, uni_lat = self.university_coords[school]
                
                flows.append({
                    'source': province,
                    'target': school,
                    'count': count,
                    'source_lon': prov_lon,
                    'source_lat': prov_lat,
                    'target_lon': uni_lon,
                    'target_lat': uni_lat,
                })
        
        flows.sort(key=lambda x: x['count'], reverse=True)
        return flows

    def get_concentration_ratio(self, top_k: int = 3) -> Dict[str, float]:
        province_counts = self.data['province'].value_counts()
        total = len(self.data)
        top_total = province_counts.head(top_k).sum()
        
        return {
            f'top{top_k}_ratio': top_total / total,
            'top_provinces': province_counts.head(top_k).index.tolist()
        }

    def get_yearly_flow_trend(self, target_school: str = '清华大学') -> Dict[int, Dict[str, int]]:
        filtered = self.data[self.data['school'] == target_school]
        trend = defaultdict(dict)
        
        for year, group in filtered.groupby('year'):
            province_counts = group['province'].value_counts().to_dict()
            trend[year] = province_counts
        
        return dict(trend)

    def get_major_trend(self, years: List[int] = None) -> pd.DataFrame:
        if years:
            filtered = self.data[self.data['year'].isin(years)]
        else:
            filtered = self.data
        
        trend = filtered.groupby(['year', 'major_category']).size().unstack(fill_value=0)
        return trend

    def get_major_category_stats(self) -> Dict[str, Dict]:
        stats = {}
        for category, group in self.data.groupby('major_category'):
            stats[category] = {
                'count': len(group),
                'top_schools': group['school'].value_counts().head(3).to_dict(),
                'top_provinces': group['province'].value_counts().head(5).to_dict()
            }
        return stats

    def get_province_ranking(self) -> List[Dict]:
        province_stats = []
        for province, group in self.data.groupby('province'):
            top_schools = group['school'].value_counts().head(3).to_dict()
            province_stats.append({
                'province': province,
                'total_count': len(group),
                'top_schools': top_schools,
                'top_majors': group['major_category'].value_counts().head(3).to_dict()
            })
        
        province_stats.sort(key=lambda x: x['total_count'], reverse=True)
        return province_stats
