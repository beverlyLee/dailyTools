import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.video.dance_video_spider import DanceVideoSpider
from src.clustering.territory_cluster import TerritoryClusterer
from src.conflict.overlap_detector import OverlapDetector


def generate_mock_data(city: str = "北京", output_dir: str = "data"):
    os.makedirs(output_dir, exist_ok=True)

    print(f"正在生成 {city} 的广场舞模拟数据...")

    spider = DanceVideoSpider()
    videos = spider.search_square_dance(city=city, max_count=120, use_mock=True)
    video_file = os.path.join(output_dir, "square_dance_videos.json")
    spider.save_to_file(video_file)

    video_dicts = [v.__dict__ for v in videos]

    print("\n正在进行领地聚类分析...")
    clusterer = TerritoryClusterer(eps_meters=180, min_samples=4)
    clusters = clusterer.cluster(video_dicts)
    cluster_file = os.path.join(output_dir, "territory_clusters.json")
    clusterer.save_clusters(cluster_file)

    print("\n正在进行冲突检测...")
    cluster_dicts = clusterer.get_clusters_as_dict()
    detector = OverlapDetector(conflict_threshold=0.1)
    conflicts = detector.detect_conflicts(cluster_dicts)
    conflict_file = os.path.join(output_dir, "conflicts.json")
    detector.save_conflicts(conflict_file)

    print("\n" + "=" * 50)
    print(f"数据生成完成！")
    print(f"  视频数据: {len(videos)} 条")
    print(f"  领地聚类: {len(clusters)} 个")
    print(f"  冲突区域: {len(conflicts)} 处")

    summary = {
        "city": city,
        "total_videos": len(videos),
        "total_clusters": len(clusters),
        "total_conflicts": len(conflicts),
        "video_file": video_file,
        "cluster_file": cluster_file,
        "conflict_file": conflict_file,
    }

    summary_file = os.path.join(output_dir, "data_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    return summary


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")

    summary = generate_mock_data(city="北京", output_dir=data_dir)
    print(f"\n数据文件已保存到: {data_dir}")
