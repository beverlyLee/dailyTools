import json
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import numpy as np
from sklearn.cluster import DBSCAN


@dataclass
class TerritoryCluster:
    cluster_id: int
    name: str
    center_lat: float
    center_lng: float
    radius_meters: float
    video_count: int
    total_likes: int
    video_ids: List[str] = field(default_factory=list)
    boundary_points: List[Tuple[float, float]] = field(default_factory=list)


class TerritoryClusterer:
    def __init__(self, eps_meters: float = 150.0, min_samples: int = 3):
        self.eps_meters = eps_meters
        self.min_samples = min_samples
        self.clusters: List[TerritoryCluster] = []

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

    def _coords_to_xy(self, latitudes: np.ndarray, longitudes: np.ndarray,
                      ref_lat: float, ref_lng: float) -> Tuple[np.ndarray, np.ndarray]:
        R = 6371000
        ref_lat_rad = math.radians(ref_lat)
        x = np.radians(longitudes - ref_lng) * R * math.cos(ref_lat_rad)
        y = np.radians(latitudes - ref_lat) * R
        return x, y

    def cluster(self, videos: List[Dict]) -> List[TerritoryCluster]:
        if not videos:
            return []

        lats = np.array([v["latitude"] for v in videos])
        lngs = np.array([v["longitude"] for v in videos])

        ref_lat = float(np.mean(lats))
        ref_lng = float(np.mean(lngs))

        x, y = self._coords_to_xy(lats, lngs, ref_lat, ref_lng)
        coords = np.column_stack((x, y))

        eps_radians = self.eps_meters / 6371000
        eps_degrees = math.degrees(eps_radians)

        db = DBSCAN(eps=self.eps_meters, min_samples=self.min_samples,
                    metric='euclidean')
        labels = db.fit_predict(coords)

        unique_labels = set(labels)
        unique_labels.discard(-1)

        clusters = []
        for label in sorted(unique_labels):
            mask = labels == label
            cluster_videos = [v for i, v in enumerate(videos) if mask[i]]

            cluster_lats = lats[mask]
            cluster_lngs = lngs[mask]

            center_lat = float(np.mean(cluster_lats))
            center_lng = float(np.mean(cluster_lngs))

            distances = []
            for i in range(len(cluster_lats)):
                d = self._haversine_distance(center_lat, center_lng,
                                             cluster_lats[i], cluster_lngs[i])
                distances.append(d)

            radius_meters = float(np.percentile(distances, 85)) if distances else 50.0
            radius_meters = max(radius_meters, 30.0)

            total_likes = sum(v.get("likes", 0) for v in cluster_videos)

            poi_names = {}
            for v in cluster_videos:
                name = v.get("poi_name", "未知地点")
                poi_names[name] = poi_names.get(name, 0) + 1

            top_poi = max(poi_names, key=poi_names.get) if poi_names else "未知地点"
            cluster_name = f"{top_poi}舞队"

            boundary_points = self._compute_boundary(
                cluster_lats, cluster_lngs, center_lat, center_lng, radius_meters
            )

            cluster = TerritoryCluster(
                cluster_id=int(label),
                name=cluster_name,
                center_lat=round(float(center_lat), 6),
                center_lng=round(float(center_lng), 6),
                radius_meters=round(float(radius_meters), 1),
                video_count=int(len(cluster_videos)),
                total_likes=int(total_likes),
                video_ids=[v.get("video_id", "") for v in cluster_videos],
                boundary_points=boundary_points,
            )
            clusters.append(cluster)

        name_counts = {}
        for cluster in clusters:
            base_name = cluster.name
            if base_name in name_counts:
                name_counts[base_name] += 1
                cluster.name = f"{base_name.replace('舞队', '')}{name_counts[base_name]}队"
            else:
                name_counts[base_name] = 1

        clusters.sort(key=lambda c: c.video_count, reverse=True)
        for idx, cluster in enumerate(clusters):
            cluster.cluster_id = idx

        self.clusters = clusters
        return clusters

    def _compute_boundary(self, lats: np.ndarray, lngs: np.ndarray,
                          center_lat: float, center_lng: float,
                          radius_meters: float) -> List[Tuple[float, float]]:
        points = []
        num_points = 36

        R = 6371000
        lat_rad = math.radians(center_lat)

        for i in range(num_points):
            angle = 2 * math.pi * i / num_points
            dx = radius_meters * math.cos(angle)
            dy = radius_meters * math.sin(angle)

            delta_lat = (dy / R) * (180 / math.pi)
            delta_lng = (dx / (R * math.cos(lat_rad))) * (180 / math.pi)

            point_lat = center_lat + delta_lat
            point_lng = center_lng + delta_lng
            points.append((round(point_lat, 6), round(point_lng, 6)))

        return points

    def get_clusters_as_dict(self) -> List[Dict]:
        result = []
        colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
            "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
            "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1",
        ]

        for i, cluster in enumerate(self.clusters):
            color = colors[i % len(colors)]
            result.append({
                "cluster_id": cluster.cluster_id,
                "name": cluster.name,
                "center": {"lat": cluster.center_lat, "lng": cluster.center_lng},
                "radius_meters": cluster.radius_meters,
                "video_count": cluster.video_count,
                "total_likes": cluster.total_likes,
                "color": color,
                "boundary": [
                    {"lat": lat, "lng": lng}
                    for lat, lng in cluster.boundary_points
                ],
            })
        return result

    def save_clusters(self, filepath: str):
        data = self.get_clusters_as_dict()
        import os
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已保存 {len(data)} 个领地聚类到 {filepath}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, "../../")
    from video.dance_video_spider import DanceVideoSpider

    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city="北京", max_count=100)
    video_dicts = [v.__dict__ for v in videos]

    clusterer = TerritoryClusterer(eps_meters=150, min_samples=3)
    clusters = clusterer.cluster(video_dicts)

    print(f"共识别出 {len(clusters)} 个舞队活动领地:")
    for c in clusters:
        print(f"  [{c.cluster_id}] {c.name} - 中心: ({c.center_lat}, {c.center_lng}), "
              f"半径: {c.radius_meters}米, 视频数: {c.video_count}")
