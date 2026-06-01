#!/usr/bin/env python3
"""测试各个模块功能"""

import sys
sys.path.insert(0, '.')

def test_poi_extractor():
    print("=== 测试 POI 提取器 ===")
    from src.mining.poi_extractor import PoiExtractor
    
    extractor = PoiExtractor()
    
    pois = extractor.get_city_pois('北京', 3)
    print(f"获取北京3天行程POI: {pois}")
    
    pois_with_loc = extractor.enrich_poi_with_location(pois, '北京')
    print(f"\n前3个POI的详细信息:")
    for poi in pois_with_loc[:3]:
        print(f"  {poi['name']}: ({poi['lat']}, {poi['lng']}) - {poi['duration']}分钟 - {poi['category']}")
    
    assert all('duration' in p for p in pois_with_loc), "所有POI应有游玩时长"
    assert all('category' in p for p in pois_with_loc), "所有POI应有类别"
    print("POI提取器测试通过 ✓\n")
    return pois_with_loc

def test_route_optimizer(pois_with_loc):
    print("=== 测试路径优化器 ===")
    from src.routing.route_optimizer import RouteOptimizer
    
    optimizer = RouteOptimizer()
    
    print("配置参数:")
    for key, value in optimizer.config.items():
        print(f"  {key}: {value}")
    
    distance = optimizer._calculate_distance_fallback(pois_with_loc[0], pois_with_loc[1])
    print(f"\nPOI1到POI2的距离: {distance} 米")
    print(f"预计步行时间: {optimizer.calculate_walk_time(distance)} 分钟")
    
    route_data = optimizer.optimize_route(pois_with_loc, 3)
    print(f"\n优化后的行程天数: {len(route_data['days'])}")
    print(f"总步行距离: {route_data['total_distance']} 米")
    print(f"总游玩时长: {route_data['total_duration']} 分钟 ({round(route_data['total_duration']/60, 1)} 小时)")
    
    for day in route_data['days']:
        print(f"\n  第{day['day']}天: {len(day['pois'])}个POI, "
              f"步行{day['total_distance']}米, "
              f"游玩{round(day['total_duration']/60, 1)}小时")
        
        print(f"  时间安排:")
        for ts in day['time_schedule']:
            meal_note = " [建议用餐]" if ts['is_meal'] else ""
            print(f"    {ts['arrival_time']}-{ts['departure_time']} {ts['poi_name']} ({ts['duration']}分钟){meal_note}")
    
    assert len(route_data['days']) > 0, "应该有至少1天的行程"
    assert 'time_schedule' in route_data['days'][0], "应该有时间安排"
    print("\n路径优化器测试通过 ✓\n")
    return route_data

def test_ai_polisher(route_data):
    print("=== 测试AI行程润色 ===")
    from src.ai.trip_polisher import TripPolisher
    
    polisher = TripPolisher()
    
    polished = polisher._fallback_polish('北京', 3, route_data)
    print(f"润色后的标题: {polished['polished_content']['title']}")
    print(f"润色内容预览: {polished['polished_content']['content'][:200]}...")
    
    assert 'title' in polished['polished_content'], "应该有标题"
    assert 'content' in polished['polished_content'], "应该有内容"
    print("AI行程润色测试通过 ✓\n")

def main():
    try:
        pois = test_poi_extractor()
        route_data = test_route_optimizer(pois)
        test_ai_polisher(route_data)
        print("🎉 所有模块测试通过!")
        return 0
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
