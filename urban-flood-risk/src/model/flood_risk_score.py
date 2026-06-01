import os
import json
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

class FloodRiskModel:
    def __init__(self):
        self.risk_zones = []
        self.historical_data = []
    
    def load_historical_data(self, reports: List[Dict[str, Any]]):
        self.historical_data = reports
    
    def calculate_risk_score(self, report: Dict[str, Any]) -> float:
        score = 0.0
        
        depth_score = min(report["water_depth"] * 50, 30)
        score += depth_score
        
        risk_multiplier = {
            "high": 1.5,
            "medium": 1.0,
            "low": 0.5
        }
        score *= risk_multiplier.get(report["risk_level"], 1.0)
        
        return min(score, 100.0)
    
    def generate_risk_zones(self, eps: float = 0.005, min_samples: int = 3) -> List[Dict[str, Any]]:
        if not self.historical_data:
            return []
        
        coords = np.array([[r["latitude"], r["longitude"]] for r in self.historical_data])
        scaler = StandardScaler()
        coords_scaled = scaler.fit_transform(coords)
        
        dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        labels = dbscan.fit_predict(coords_scaled)
        
        clusters = {}
        for i, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(self.historical_data[i])
        
        risk_zones = []
        for label, reports in clusters.items():
            if label == -1:
                continue
            
            lats = [r["latitude"] for r in reports]
            lngs = [r["longitude"] for r in reports]
            
            avg_lat = sum(lats) / len(lats)
            avg_lng = sum(lngs) / len(lngs)
            count = len(reports)
            
            avg_risk_score = sum(self.calculate_risk_score(r) for r in reports) / count
            
            risk_level = self._determine_risk_level(avg_risk_score, count)
            
            zone = {
                "id": f"zone_{label}",
                "name": reports[0]["location_name"] if reports else f"风险区域_{label}",
                "center_lat": avg_lat,
                "center_lng": avg_lng,
                "bounding_box": {
                    "min_lat": min(lats),
                    "max_lat": max(lats),
                    "min_lng": min(lngs),
                    "max_lng": max(lngs)
                },
                "risk_score": round(avg_risk_score, 2),
                "risk_level": risk_level,
                "report_count": count,
                "color": self._get_risk_color(avg_risk_score),
                "reports": reports[:10]
            }
            risk_zones.append(zone)
        
        self.risk_zones = sorted(risk_zones, key=lambda x: x["risk_score"], reverse=True)
        return self.risk_zones
    
    def _determine_risk_level(self, avg_score: float, count: int) -> str:
        if avg_score >= 70 or count >= 30:
            return "high"
        elif avg_score >= 40 or count >= 15:
            return "medium"
        else:
            return "low"
    
    def _get_risk_color(self, score: float) -> str:
        if score >= 70:
            return "#dc2626"
        elif score >= 40:
            return "#f59e0b"
        else:
            return "#22c55e"
    
    def get_heatmap_data(self) -> List[Dict[str, Any]]:
        heatmap_points = []
        for zone in self.risk_zones:
            weight = zone["risk_score"] / 100
            heatmap_points.append({
                "lat": zone["center_lat"],
                "lng": zone["center_lng"],
                "weight": weight,
                "risk_level": zone["risk_level"],
                "risk_score": zone["risk_score"]
            })
        return heatmap_points
    
    def get_risk_zone_by_id(self, zone_id: str) -> Dict[str, Any]:
        for zone in self.risk_zones:
            if zone["id"] == zone_id:
                return zone
        return None
    
    def get_high_risk_zones(self) -> List[Dict[str, Any]]:
        return [zone for zone in self.risk_zones if zone["risk_level"] == "high"]