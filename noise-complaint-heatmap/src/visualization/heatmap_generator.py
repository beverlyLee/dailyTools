import json
import os
from typing import Dict, List, Optional


class HeatmapGenerator:
    def __init__(self):
        self.data_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            'data'
        )
        os.makedirs(self.data_dir, exist_ok=True)

    def generate_heatmap_data(self, complaints: List[Dict]) -> Dict:
        heatmap_data = {}
        
        for complaint in complaints:
            category = complaint.get('category', 'unknown')
            if category not in heatmap_data:
                heatmap_data[category] = []
            
            if complaint.get('lat') and complaint.get('lng'):
                heatmap_data[category].append({
                    'lat': complaint['lat'],
                    'lng': complaint['lng'],
                    'weight': 1.0,
                    'title': complaint.get('title', ''),
                    'address': complaint.get('address', '')
                })
        
        return heatmap_data

    def get_points_for_heatmap(self, complaints: List[Dict], category: Optional[str] = None) -> List[List[float]]:
        points = []
        
        for complaint in complaints:
            if category and complaint.get('category') != category:
                continue
            
            if complaint.get('lat') and complaint.get('lng'):
                points.append([
                    complaint['lat'],
                    complaint['lng'],
                    1.0
                ])
        
        return points

    def get_points_by_category(self, complaints: List[Dict]) -> Dict[str, List[List[float]]]:
        points_by_category = {}
        
        for complaint in complaints:
            category = complaint.get('category', 'unknown')
            if category not in points_by_category:
                points_by_category[category] = []
            
            if complaint.get('lat') and complaint.get('lng'):
                points_by_category[category].append([
                    complaint['lat'],
                    complaint['lng'],
                    1.0
                ])
        
        return points_by_category

    def save_heatmap_data(self, heatmap_data: Dict, filename: str = 'heatmap_data.json') -> str:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(heatmap_data, f, ensure_ascii=False, indent=2)
        return filepath

    def load_heatmap_data(self, filename: str = 'heatmap_data.json') -> Optional[Dict]:
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_category_stats(self, complaints: List[Dict]) -> Dict:
        stats = {}
        
        for complaint in complaints:
            category = complaint.get('category', 'unknown')
            if category not in stats:
                stats[category] = {
                    'count': 0,
                    'resolved': 0,
                    'points': []
                }
            
            stats[category]['count'] += 1
            if complaint.get('resolved') and complaint.get('lat') and complaint.get('lng'):
                stats[category]['resolved'] += 1
                stats[category]['points'].append([complaint['lat'], complaint['lng']])
        
        return stats

    def export_for_frontend(self, complaints: List[Dict]) -> Dict:
        points_by_category = self.get_points_by_category(complaints)
        category_stats = self.get_category_stats(complaints)
        
        return {
            'points': points_by_category,
            'stats': category_stats,
            'total_complaints': len(complaints),
            'total_resolved': sum(1 for c in complaints if c.get('resolved'))
        }


if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
    from src.crawlers.gov_complaint_spider import GovComplaintSpider
    from src.parser.address_resolver import AddressResolver
    from src.parser.noise_classifier import NoiseClassifier

    spider = GovComplaintSpider()
    resolver = AddressResolver()
    classifier = NoiseClassifier()
    generator = HeatmapGenerator()

    complaints = spider.crawl_mock_data()
    complaints = resolver.batch_resolve(complaints)
    complaints = classifier.batch_classify(complaints)

    heatmap_data = generator.export_for_frontend(complaints)
    print(f"热力图数据生成完成:")
    for cat, points in heatmap_data['points'].items():
        print(f"  {cat}: {len(points)} 个点")
