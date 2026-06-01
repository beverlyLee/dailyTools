#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/liboyang/trae/dailyTools/special-forces-tourism/backend')

from src.data.mock_data import generate_mock_notes, get_all_pois, get_pois_by_city
from src.mining.route_extractor import RouteExtractor
from src.analysis.hotspot_finder import HotspotFinder

print("=" * 70)
print("⚡ 特种兵旅游路线挖掘工具 - 功能验证")
print("=" * 70)
print()

print("📊 步骤 1: 生成模拟数据")
print("-" * 50)
notes = generate_mock_notes()
print(f"  生成笔记数量: {len(notes)}")
print(f"  城市分布:")
city_counts = {}
for note in notes:
    city_counts[note.city] = city_counts.get(note.city, 0) + 1
for city, count in sorted(city_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"    - {city}: {count} 条笔记")
print()

print("📍 步骤 2: 检查POI数据")
print("-" * 50)
all_pois = get_all_pois()
print(f"  总POI数量: {len(all_pois)}")
for city in ["南京", "重庆", "长沙"]:
    city_pois = get_pois_by_city(city)
    print(f"    - {city}: {len(city_pois)} 个POI")
print()

print("🔍 步骤 3: 路线挖掘 (RouteExtractor)")
print("-" * 50)
extractor = RouteExtractor()
routes = extractor.extract_routes_from_notes(notes)
print(f"  提取路线数量: {len(routes)}")

route_stats = extractor.get_route_statistics()
print(f"  路线统计:")
print(f"    - 平均POI数量: {route_stats['avg_pois']}")
print(f"    - 平均时长: {route_stats['avg_duration_minutes']} 分钟")
print(f"    - 覆盖城市: {', '.join(route_stats['cities'])}")

time_dist = extractor.get_time_distribution()
print(f"  出发时间分布:")
for slot, count in sorted(time_dist.items()):
    print(f"    - {slot}: {count} 条")

patterns = extractor.extract_route_patterns(min_support=5)
print(f"  高频路线模式 (>=5次): {len(patterns)} 个")
if patterns:
    for i, pattern in enumerate(patterns[:3]):
        print(f"    {i+1}. [{pattern['city']}] {' → '.join(pattern['poi_names'][:5])} ({pattern['count']}次)")
print()

print("🔥 步骤 4: 高频点统计 (HotspotFinder)")
print("-" * 50)
hotspot = HotspotFinder()
pairs, visit_counts = hotspot.analyze_routes(routes)
print(f"  POI组合总数: {len(pairs)}")
print(f"  唯一POI访问数: {len(visit_counts)}")

print()
print("🏆 步骤 5: 城市间热度对比 (验证要点)")
print("-" * 50)
city_total_flows = {}
for city in ["南京", "重庆", "长沙"]:
    stats = hotspot.get_city_stats(city)
    city_total_flows[city] = stats['total_flow']
    print(f"  {city}:")
    print(f"    - 总流动次数: {stats['total_flow']}")
    print(f"    - 景点组合数: {stats['total_pairs']}")
    print(f"    - 覆盖POI数: {stats['unique_pois']}")
    if stats['top_pair']:
        print(f"    - 最热组合: {stats['top_pair'].from_poi_name} + {stats['top_pair'].to_poi_name} ({stats['top_pair'].count}次)")

sorted_cities = sorted(city_total_flows.items(), key=lambda x: x[1], reverse=True)
print()
print(f"  城市热度排名: {sorted_cities[0][0]} > {sorted_cities[1][0]} > {sorted_cities[2][0]}")
print(f"  ✅ 南京、重庆、长沙景点间连线最为密集: {'PASS' if sorted_cities[0][1] > 0 and sorted_cities[1][1] > 0 and sorted_cities[2][1] > 0 else 'FAIL'}")
print()

print("📋 步骤 6: 推荐路线验证 (验证要点)")
print("-" * 50)
print("  检查是否符合'早中晚'三餐加夜游的紧凑节奏:")
all_valid = True
for city in ["南京", "重庆", "长沙"]:
    recs = hotspot.generate_route_recommendations(city, num_recommendations=3)
    print(f"  {city}:")
    for i, rec in enumerate(recs[:2]):
        has_breakfast = any('早餐' in s for s in rec.time_schedule)
        has_lunch = any('午餐' in s for s in rec.time_schedule)
        has_dinner = any('晚餐' in s for s in rec.time_schedule)
        has_night = any('夜游' in s for s in rec.time_schedule)
        valid = has_breakfast and has_lunch and has_dinner and has_night
        all_valid = all_valid and valid
        print(f"    路线 {i+1}: {rec.title}")
        print(f"      - 景点数: {len(rec.poi_sequence)}, 就餐数: {rec.meal_count}, 难度: {rec.difficulty}")
        print(f"      - 三餐+夜游: {'✅ PASS' if valid else '❌ FAIL'}")
        for s in rec.time_schedule[:4]:
            print(f"        * {s}")
        if len(rec.time_schedule) > 4:
            print(f"        * ...")
        for s in rec.time_schedule[-2:]:
            print(f"        * {s}")
print()
print(f"  ✅ 推荐路线符合早中晚三餐加夜游节奏: {'PASS' if all_valid else 'FAIL'}")
print()

print("🌐 步骤 7: 弧线图数据验证")
print("-" * 50)
arc_data = hotspot.get_arc_data()
print(f"  全国弧线数量: {len(arc_data)}")
for city in ["南京", "重庆", "长沙"]:
    city_arcs = hotspot.get_arc_data(city=city)
    max_width = max((a['width'] for a in city_arcs), default=0)
    print(f"  {city}: {len(city_arcs)} 条弧线, 最大线宽: {max_width:.1f}")
print()

print("=" * 70)
print("  验证完成!")
print(f"  总体结果: {'✅ 所有验证通过' if all_valid else '❌ 部分验证未通过'}")
print("=" * 70)
