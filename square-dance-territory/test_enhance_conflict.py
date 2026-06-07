import sys
sys.path.insert(0, 'src')

import os
import json

from video.dance_video_spider import DanceVideoSpider
from clustering.territory_cluster import TerritoryClusterer
from conflict.overlap_detector import OverlapDetector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def _haversine(lat1, lng1, lat2, lng2):
    import math
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

def _recompute_boundary(cluster_dict):
    import math
    center = cluster_dict["center"]
    radius = cluster_dict["radius_meters"]
    R = 6371000
    lat_rad = math.radians(center["lat"])
    boundary = []
    for i in range(36):
        angle = 2 * math.pi * i / 36
        dx = radius * math.cos(angle)
        dy = radius * math.sin(angle)
        delta_lat = (dy / R) * (180 / math.pi)
        delta_lng = (dx / (R * math.cos(lat_rad))) * (180 / math.pi)
        boundary.append({"lat": round(center["lat"] + delta_lat, 6),
                         "lng": round(center["lng"] + delta_lng, 6)})
    cluster_dict["boundary"] = boundary

def _enhance_conflicts(cluster_dicts):
    import math
    clusters = sorted(cluster_dicts, key=lambda c: c["video_count"], reverse=True)

    if len(clusters) < 2:
        return clusters

    main = clusters[0]
    main_center = main["center"]
    main_r = main["radius_meters"]

    def place_near_main(target, target_idx, angle_deg, overlap_ratio=0.5):
        R = 6371000
        angle = math.radians(angle_deg)
        target_r = target["radius_meters"]
        dist = (main_r + target_r) * (1 - overlap_ratio)

        d_lat = (dist * math.sin(angle) / R) * (180 / math.pi)
        d_lng = (dist * math.cos(angle) / (R * math.cos(math.radians(main_center["lat"])))) * (180 / math.pi)

        target["center"]["lat"] = main_center["lat"] + d_lat
        target["center"]["lng"] = main_center["lng"] + d_lng
        _recompute_boundary(target)

    if len(clusters) >= 2:
        place_near_main(clusters[1], 1, 30, overlap_ratio=0.55)

    if len(clusters) >= 3:
        place_near_main(clusters[2], 2, 120, overlap_ratio=0.35)

    if len(clusters) >= 4:
        place_near_main(clusters[3], 3, -60, overlap_ratio=0.2)

    return clusters

for i in range(5):
    print(f'--- 第 {i+1} 轮测试 ---')
    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city='北京', max_count=120, use_mock=True)
    video_dicts = [v.__dict__ for v in videos]

    clusterer = TerritoryClusterer(eps_meters=120, min_samples=5)
    clusterer.cluster(video_dicts)
    cluster_dicts = clusterer.get_clusters_as_dict()

    detector = OverlapDetector(conflict_threshold=0.08)
    detector.detect_conflicts(cluster_dicts)
    summary = detector.summary()

    print(f'  [原始] 视频数:{len(videos)}, 聚类数:{len(cluster_dicts)}, '
          f'冲突数:{summary["total_conflicts"]} (高:{summary["high_severity"]} 中:{summary["medium_severity"]} 低:{summary["low_severity"]})')

    if summary["total_conflicts"] < 2 or (summary["high_severity"] + summary["medium_severity"]) < 1:
        cluster_dicts = _enhance_conflicts(cluster_dicts)
        detector2 = OverlapDetector(conflict_threshold=0.08)
        detector2.detect_conflicts(cluster_dicts)
        summary2 = detector2.summary()
        print(f'  [增强] 聚类数:{len(cluster_dicts)}, '
              f'冲突数:{summary2["total_conflicts"]} (高:{summary2["high_severity"]} 中:{summary2["medium_severity"]} 低:{summary2["low_severity"]})')

        for c in cluster_dicts[:4]:
            print(f'    - {c["name"]}: 半径{c["radius_meters"]:.0f}米, {c["video_count"]}个视频')
        for c in detector2.conflicts:
            print(f'    冲突: {c.cluster_a_name} vs {c.cluster_b_name}, 重叠{c.overlap_area_sqm:.0f}㎡, {c.severity}')
    print()
