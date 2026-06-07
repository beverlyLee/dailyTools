import sys
sys.path.insert(0, 'src')

from video.dance_video_spider import DanceVideoSpider
from clustering.territory_cluster import TerritoryClusterer
from conflict.overlap_detector import OverlapDetector

for i in range(5):
    print(f'--- 第 {i+1} 轮测试 ---')
    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city='北京', max_count=120, use_mock=True)
    video_dicts = [v.__dict__ for v in videos]

    clusterer = TerritoryClusterer(eps_meters=120, min_samples=5)
    clusterer.cluster(video_dicts)
    cluster_dicts = clusterer.get_clusters_as_dict()

    detector = OverlapDetector(conflict_threshold=0.1)
    detector.detect_conflicts(cluster_dicts)
    summary = detector.summary()

    print(f'  视频数: {len(videos)}')
    print(f'  聚类数: {len(cluster_dicts)}')
    print(f'  冲突数: {summary["total_conflicts"]} (严重:{summary["high_severity"]}, 中度:{summary["medium_severity"]}, 轻度:{summary["low_severity"]})')

    for c in cluster_dicts:
        print(f'    - {c["name"]}: 半径{c["radius_meters"]:.0f}米, {c["video_count"]}个视频')

    for c in detector.conflicts:
        print(f'    冲突: {c.cluster_a_name} vs {c.cluster_b_name}, 重叠{c.overlap_area_sqm:.0f}㎡, {c.severity}')
    print()
