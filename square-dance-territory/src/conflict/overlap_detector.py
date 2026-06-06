import json
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class OverlapConflict:
    conflict_id: str
    cluster_a_id: int
    cluster_b_id: int
    cluster_a_name: str
    cluster_b_name: str
    overlap_area_sqm: float
    overlap_percentage_a: float
    overlap_percentage_b: float
    center_distance_meters: float
    severity: str
    intersection_points: List[Tuple[float, float]] = field(default_factory=list)


class OverlapDetector:
    def __init__(self, conflict_threshold: float = 0.2):
        self.conflict_threshold = conflict_threshold
        self.conflicts: List[OverlapConflict] = []

    def _haversine_distance(self, lat1: float, lng1: float,
                            lat2: float, lng2: float) -> float:
        R = 6371000

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _circle_overlap_area(self, r1: float, r2: float, d: float) -> float:
        if d >= r1 + r2:
            return 0.0
        if d <= abs(r1 - r2):
            return math.pi * min(r1, r2) ** 2

        part1 = r1 ** 2 * math.acos((d ** 2 + r1 ** 2 - r2 ** 2) / (2 * d * r1))
        part2 = r2 ** 2 * math.acos((d ** 2 + r2 ** 2 - r1 ** 2) / (2 * d * r2))
        part3 = 0.5 * math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))

        return part1 + part2 - part3

    def _intersection_points(self, lat1: float, lng1: float, r1: float,
                             lat2: float, lng2: float, r2: float
                             ) -> List[Tuple[float, float]]:
        d = self._haversine_distance(lat1, lng1, lat2, lng2)

        if d >= r1 + r2 or d <= abs(r1 - r2) or d == 0:
            return []

        R = 6371000
        x1, y1 = 0, 0

        bearing = math.atan2(
            math.sin(math.radians(lng2 - lng1)) * math.cos(math.radians(lat2)),
            math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) -
            math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.cos(math.radians(lng2 - lng1))
        )
        x2, y2 = d * math.cos(bearing), d * math.sin(bearing)

        a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d)
        h_sq = r1 ** 2 - a ** 2

        if h_sq < 0:
            return []

        h = math.sqrt(h_sq)

        mid_x = a * math.cos(bearing)
        mid_y = a * math.sin(bearing)

        perp_bearing = bearing + math.pi / 2

        points = []
        for sign in [1, -1]:
            px = mid_x + sign * h * math.cos(perp_bearing)
            py = mid_y + sign * h * math.sin(perp_bearing)

            lat = lat1 + (py / R) * (180 / math.pi)
            lng = lng1 + (px / (R * math.cos(math.radians(lat1)))) * (180 / math.pi)
            points.append((round(lat, 6), round(lng, 6)))

        return points

    def detect_conflicts(self, clusters: List[Dict]) -> List[OverlapConflict]:
        conflicts = []

        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                a = clusters[i]
                b = clusters[j]

                center_a = a.get("center", {"lat": 0, "lng": 0})
                center_b = b.get("center", {"lat": 0, "lng": 0})

                r_a = a.get("radius_meters", 0)
                r_b = b.get("radius_meters", 0)

                d = self._haversine_distance(
                    center_a["lat"], center_a["lng"],
                    center_b["lat"], center_b["lng"]
                )

                overlap_area = self._circle_overlap_area(r_a, r_b, d)

                if overlap_area <= 0:
                    continue

                area_a = math.pi * r_a ** 2
                area_b = math.pi * r_b ** 2

                overlap_pct_a = overlap_area / area_a if area_a > 0 else 0
                overlap_pct_b = overlap_area / area_b if area_b > 0 else 0

                max_overlap = max(overlap_pct_a, overlap_pct_b)

                if max_overlap < self.conflict_threshold:
                    continue

                if max_overlap >= 0.6:
                    severity = "high"
                elif max_overlap >= 0.35:
                    severity = "medium"
                else:
                    severity = "low"

                intersect_points = self._intersection_points(
                    center_a["lat"], center_a["lng"], r_a,
                    center_b["lat"], center_b["lng"], r_b
                )

                conflict = OverlapConflict(
                    conflict_id=f"conflict_{a['cluster_id']}_{b['cluster_id']}",
                    cluster_a_id=a["cluster_id"],
                    cluster_b_id=b["cluster_id"],
                    cluster_a_name=a.get("name", f"舞队{a['cluster_id']}"),
                    cluster_b_name=b.get("name", f"舞队{b['cluster_id']}"),
                    overlap_area_sqm=round(overlap_area, 2),
                    overlap_percentage_a=round(overlap_pct_a * 100, 2),
                    overlap_percentage_b=round(overlap_pct_b * 100, 2),
                    center_distance_meters=round(d, 2),
                    severity=severity,
                    intersection_points=intersect_points,
                )
                conflicts.append(conflict)

        self.conflicts = conflicts
        return conflicts

    def get_conflicts_as_dict(self) -> List[Dict]:
        result = []
        for conflict in self.conflicts:
            severity_colors = {
                "high": "#FF0000",
                "medium": "#FF8C00",
                "low": "#FFD700",
            }
            result.append({
                "conflict_id": conflict.conflict_id,
                "cluster_a_id": conflict.cluster_a_id,
                "cluster_b_id": conflict.cluster_b_id,
                "cluster_a_name": conflict.cluster_a_name,
                "cluster_b_name": conflict.cluster_b_name,
                "overlap_area_sqm": conflict.overlap_area_sqm,
                "overlap_percentage_a": conflict.overlap_percentage_a,
                "overlap_percentage_b": conflict.overlap_percentage_b,
                "center_distance_meters": conflict.center_distance_meters,
                "severity": conflict.severity,
                "severity_color": severity_colors.get(conflict.severity, "#FFD700"),
                "intersection_points": [
                    {"lat": lat, "lng": lng}
                    for lat, lng in conflict.intersection_points
                ],
                "warning_label": self._get_warning_label(conflict),
            })
        return result

    def _get_warning_label(self, conflict: OverlapConflict) -> str:
        labels = {
            "high": "⚠️ 严重冲突！两舞队活动范围高度重叠",
            "medium": "⚡ 中度冲突，建议错峰活动",
            "low": "注意：领地存在部分重叠",
        }
        return labels.get(conflict.severity, "注意：领地存在重叠")

    def summary(self) -> Dict:
        high = sum(1 for c in self.conflicts if c.severity == "high")
        medium = sum(1 for c in self.conflicts if c.severity == "medium")
        low = sum(1 for c in self.conflicts if c.severity == "low")

        return {
            "total_conflicts": len(self.conflicts),
            "high_severity": high,
            "medium_severity": medium,
            "low_severity": low,
        }

    def save_conflicts(self, filepath: str):
        data = {
            "summary": self.summary(),
            "conflicts": self.get_conflicts_as_dict(),
        }
        import os
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已保存 {len(self.conflicts)} 个冲突检测结果到 {filepath}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "../../")

    from clustering.territory_cluster import TerritoryClusterer
    from video.dance_video_spider import DanceVideoSpider

    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city="北京", max_count=100)
    video_dicts = [v.__dict__ for v in videos]

    clusterer = TerritoryClusterer(eps_meters=150, min_samples=3)
    clusters = clusterer.cluster(video_dicts)
    cluster_dicts = clusterer.get_clusters_as_dict()

    detector = OverlapDetector(conflict_threshold=0.1)
    conflicts = detector.detect_conflicts(cluster_dicts)

    print(f"\n冲突检测结果:")
    print(f"  总计: {len(conflicts)} 处冲突")
    summary = detector.summary()
    print(f"  严重: {summary['high_severity']}, 中度: {summary['medium_severity']}, 轻度: {summary['low_severity']}")

    for c in conflicts:
        print(f"\n  [{c.severity.upper()}] {c.cluster_a_name} vs {c.cluster_b_name}")
        print(f"    重叠面积: {c.overlap_area_sqm:.1f} 平方米")
        print(f"    重叠比例: {c.overlap_percentage_a:.1f}% / {c.overlap_percentage_b:.1f}%")
