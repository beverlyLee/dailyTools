import os
import math
import json
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize
from dotenv import load_dotenv

load_dotenv()

CITY_CENTER_LNG = float(os.getenv("CITY_CENTER_LNG", "116.397428"))
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", "39.90923"))

DIRECTION_NAMES = {
    0: "北",
    22.5: "北偏东",
    45: "东北",
    67.5: "东偏北",
    90: "东",
    112.5: "东偏南",
    135: "东南",
    157.5: "南偏东",
    180: "南",
    202.5: "南偏西",
    225: "西南",
    247.5: "西偏南",
    270: "西",
    292.5: "西偏北",
    315: "西北",
    337.5: "北偏西"
}


class FlowDirectionAnalyzer:
    def __init__(self, center_lng: float = CITY_CENTER_LNG, center_lat: float = CITY_CENTER_LAT):
        self.center_lng = center_lng
        self.center_lat = center_lat
        self.direction_clusters: List[Dict[str, Any]] = []

    def analyze_traffic_directions(self, segments: List[Dict[str, Any]], 
                                    n_clusters: int = 12) -> List[Dict[str, Any]]:
        if not segments:
            return []

        directions = np.array([s["direction"] for s in segments if s.get("is_congested", False)]).reshape(-1, 1)
        
        if len(directions) == 0:
            return []

        X = np.concatenate([np.sin(np.radians(directions)), np.cos(np.radians(directions))], axis=1)

        kmeans = KMeans(n_clusters=min(n_clusters, len(directions)), random_state=42, n_init=10)
        labels = kmeans.fit_predict(X)

        cluster_centers = kmeans.cluster_centers_
        angles = np.degrees(np.arctan2(cluster_centers[:, 0], cluster_centers[:, 1]))
        angles = (angles + 360) % 360

        self.direction_clusters = []
        for i, angle in enumerate(angles):
            cluster_indices = np.where(labels == i)[0]
            cluster_segments = [segments[j] for j in cluster_indices]
            
            avg_congestion = np.mean([s.get("congestion_level", 0) for s in cluster_segments])
            avg_speed = np.mean([s.get("speed", 0) for s in cluster_segments])
            flow_volume = len(cluster_indices)
            
            self.direction_clusters.append({
                "cluster_id": i,
                "direction_angle": float(angle),
                "direction_name": self._get_direction_name(angle),
                "flow_volume": int(flow_volume),
                "avg_congestion": float(avg_congestion),
                "avg_speed": float(avg_speed),
                "segments_count": len(cluster_segments),
                "representative_segment": self._get_representative_segment(cluster_segments, angle)
            })

        self.direction_clusters.sort(key=lambda x: x["flow_volume"], reverse=True)
        
        total = sum(c["flow_volume"] for c in self.direction_clusters)
        for cluster in self.direction_clusters:
            cluster["flow_percentage"] = round((cluster["flow_volume"] / total) * 100, 2) if total > 0 else 0

        return self.direction_clusters

    def _get_direction_name(self, angle: float) -> str:
        min_diff = 360
        closest_direction = 0
        
        for dir_angle in DIRECTION_NAMES.keys():
            diff = abs(angle - dir_angle)
            if diff > 180:
                diff = 360 - diff
            if diff < min_diff:
                min_diff = diff
                closest_direction = dir_angle
        
        return DIRECTION_NAMES[closest_direction]

    def _get_representative_segment(self, segments: List[Dict[str, Any]], target_angle: float) -> Dict[str, Any]:
        if not segments:
            return {}
        
        best_segment = segments[0]
        min_diff = 360
        
        for seg in segments:
            diff = abs(seg["direction"] - target_angle)
            if diff > 180:
                diff = 360 - diff
            if diff < min_diff:
                min_diff = diff
                best_segment = seg
        
        return {
            "start_lng": best_segment["start_lng"],
            "start_lat": best_segment["start_lat"],
            "end_lng": best_segment["end_lng"],
            "end_lat": best_segment["end_lat"],
            "name": best_segment.get("name", "")
        }

    def get_radial_lines(self, max_radius_km: float = 80) -> List[Dict[str, Any]]:
        radial_lines = []
        
        for cluster in self.direction_clusters:
            angle = math.radians(cluster["direction_angle"])
            
            end_lng = self.center_lng + (max_radius_km / 111.32) * math.cos(angle)
            end_lat = self.center_lat + (max_radius_km / 111.32) * math.sin(angle)
            
            line_width = self._calculate_line_width(cluster["flow_volume"])
            
            radial_lines.append({
                "direction": cluster["direction_name"],
                "direction_angle": cluster["direction_angle"],
                "start": [self.center_lng, self.center_lat],
                "end": [end_lng, end_lat],
                "flow_volume": cluster["flow_volume"],
                "flow_percentage": cluster["flow_percentage"],
                "line_width": line_width,
                "avg_congestion": cluster["avg_congestion"],
                "color": self._get_congestion_color(cluster["avg_congestion"])
            })
        
        return radial_lines

    def _calculate_line_width(self, flow_volume: int) -> int:
        max_volume = max(c["flow_volume"] for c in self.direction_clusters) if self.direction_clusters else 1
        normalized = flow_volume / max_volume
        return max(2, int(normalized * 10))

    def _get_congestion_color(self, congestion_level: float) -> str:
        if congestion_level <= 1:
            return "#00FF00"
        elif congestion_level <= 2:
            return "#FFFF00"
        elif congestion_level <= 3:
            return "#FFA500"
        else:
            return "#FF0000"

    def detect_flow_direction(self, is_friday_evening: bool = True) -> str:
        if is_friday_evening:
            return "outbound"
        else:
            return "inbound"

    def save_analysis(self, filepath: str = None):
        if filepath is None:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = f"/Users/liboyang/trae/dailyTools/weekend-escape/data/direction_analysis_{timestamp}.json"
        
        output = {
            "center": [self.center_lng, self.center_lat],
            "timestamp": datetime.datetime.now().isoformat(),
            "direction_clusters": self.direction_clusters,
            "radial_lines": self.get_radial_lines()
        }
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Direction analysis saved to {filepath}")

    def get_heatmap_data(self) -> List[Dict[str, Any]]:
        heatmap_points = []
        for cluster in self.direction_clusters:
            rep = cluster.get("representative_segment", {})
            if rep:
                heatmap_points.append({
                    "lng": rep.get("end_lng", self.center_lng),
                    "lat": rep.get("end_lat", self.center_lat),
                    "weight": cluster["flow_volume"]
                })
        return heatmap_points


def analyze_traffic_flow(segments: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    analyzer = FlowDirectionAnalyzer()
    clusters = analyzer.analyze_traffic_directions(segments)
    radial_lines = analyzer.get_radial_lines()
    
    print(f"\n=== Traffic Flow Analysis ===")
    for cluster in clusters:
        print(f"{cluster['direction_name']} ({cluster['direction_angle']:.1f}°): "
              f"{cluster['flow_volume']} segments ({cluster['flow_percentage']}%), "
              f"拥堵等级: {cluster['avg_congestion']:.1f}")
    
    analyzer.save_analysis()
    return clusters, radial_lines


if __name__ == "__main__":
    sample_segments = [
        {"direction": 10, "is_congested": True, "congestion_level": 3, "speed": 30,
         "start_lng": 116.397, "start_lat": 39.909, "end_lng": 116.4, "end_lat": 39.92},
        {"direction": 95, "is_congested": True, "congestion_level": 2, "speed": 40,
         "start_lng": 116.397, "start_lat": 39.909, "end_lng": 116.42, "end_lat": 39.91},
        {"direction": 185, "is_congested": True, "congestion_level": 4, "speed": 15,
         "start_lng": 116.397, "start_lat": 39.909, "end_lng": 116.4, "end_lat": 39.89},
        {"direction": 275, "is_congested": True, "congestion_level": 3, "speed": 25,
         "start_lng": 116.397, "start_lat": 39.909, "end_lng": 116.37, "end_lat": 39.91},
    ]
    analyze_traffic_flow(sample_segments)
