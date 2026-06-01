from sklearn.cluster import DBSCAN
import numpy as np
from typing import List, Dict, Tuple
from collections import Counter

class HotspotDetector:
    def __init__(self, eps: float = 0.01, min_samples: int = 5):
        self.eps = eps
        self.min_samples = min_samples
    
    def detect_hotspots(self, items: List[Dict]) -> List[Dict]:
        if not items:
            return []
        
        coords = np.array([[item["lat"], item["lng"]] for item in items])
        
        dbscan = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric="haversine")
        labels = dbscan.fit_predict(np.radians(coords))
        
        clusters = {}
        for i, label in enumerate(labels):
            if label == -1:
                continue
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(items[i])
        
        hotspots = []
        for cluster_id, cluster_items in clusters.items():
            center_lat = np.mean([item["lat"] for item in cluster_items])
            center_lng = np.mean([item["lng"] for item in cluster_items])
            
            avg_price = np.mean([item["price"] for item in cluster_items])
            type_counter = Counter([item["type"] for item in cluster_items])
            dominant_type = type_counter.most_common(1)[0][0]
            
            location_counter = Counter([item["location"] for item in cluster_items])
            location_name = location_counter.most_common(1)[0][0]
            
            hotspot = {
                "cluster_id": int(cluster_id),
                "center": {"lat": round(center_lat, 6), "lng": round(center_lng, 6)},
                "count": len(cluster_items),
                "avg_price": round(avg_price, 2),
                "dominant_type": dominant_type,
                "location": location_name,
                "items": cluster_items[:10]
            }
            hotspots.append(hotspot)
        
        hotspots.sort(key=lambda x: x["count"], reverse=True)
        return hotspots
    
    def get_heatmap_data(self, items: List[Dict]) -> List[Dict]:
        heatmap_data = []
        for item in items:
            heatmap_data.append({
                "lng": item["lng"],
                "lat": item["lat"],
                "count": 1
            })
        return heatmap_data
    
    def filter_by_type(self, items: List[Dict], item_type: str) -> List[Dict]:
        return [item for item in items if item["type"] == item_type]
    
    def get_statistics(self, items: List[Dict]) -> Dict:
        if not items:
            return {}
        
        prices = [item["price"] for item in items]
        type_counter = Counter([item["type"] for item in items])
        location_counter = Counter([item["location"] for item in items])
        
        return {
            "total_count": len(items),
            "avg_price": round(np.mean(prices), 2),
            "median_price": round(np.median(prices), 2),
            "min_price": min(prices),
            "max_price": max(prices),
            "type_distribution": dict(type_counter),
            "top_locations": dict(location_counter.most_common(5))
        }

if __name__ == "__main__":
    import sys
    sys.path.append("..")
    from data_acquisition.xianyu_crawler import XianyuCrawler
    
    crawler = XianyuCrawler()
    items = crawler.get_all_items()
    
    detector = HotspotDetector()
    hotspots = detector.detect_hotspots(items)
    
    print(f"检测到 {len(hotspots)} 个交易热点")
    for hotspot in hotspots:
        print(f"  {hotspot['location']}: {hotspot['count']} 件商品, 均价 {hotspot['avg_price']} 元")
