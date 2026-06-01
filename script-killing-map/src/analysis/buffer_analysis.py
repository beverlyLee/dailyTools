import math
from typing import List, Dict
from geopy.distance import geodesic

class BufferAnalysis:
    def __init__(self):
        pass

    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        coords_1 = (lat1, lon1)
        coords_2 = (lat2, lon2)
        return geodesic(coords_1, coords_2).meters

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def validate_distance_calculation(self, lat1: float, lon1: float, lat2: float, lon2: float) -> Dict:
        geopy_dist = self.calculate_distance(lat1, lon1, lat2, lon2)
        haversine_dist = self.haversine_distance(lat1, lon1, lat2, lon2)
        diff = abs(geopy_dist - haversine_dist)
        
        return {
            "point1": (lat1, lon1),
            "point2": (lat2, lon2),
            "geopy_distance_m": round(geopy_dist, 2),
            "haversine_distance_m": round(haversine_dist, 2),
            "difference_m": round(diff, 2),
            "is_consistent": diff < 10
        }

    def print_validation_report(self, shops: List[Dict], areas: List[Dict], area_type: str):
        print(f"\n{'=' * 60}")
        print(f"  {area_type} 距离计算验证报告")
        print(f"{'=' * 60}")
        
        for area in areas:
            print(f"\n【{area['name']}】中心坐标: ({area['latitude']}, {area['longitude']})")
            print(f"  {'门店名称':<30} {'门店坐标':<25} {'距离(km)':<10} {'计算方法验证':<15}")
            print(f"  {'-' * 80}")
            
            for shop in shops:
                validation = self.validate_distance_calculation(
                    area['latitude'], area['longitude'],
                    shop['latitude'], shop['longitude']
                )
                
                status = "✓ 一致" if validation['is_consistent'] else "✗ 不一致"
                print(f"  {shop['name']:<30} ({shop['latitude']:.3f}, {shop['longitude']:.3f})    {validation['geopy_distance_m']/1000:.2f}km     {status}")

    def analyze_university_town_buffer(self, shops: List[Dict], university_towns: List[Dict], default_radius: int = 3000) -> Dict:
        results = {
            "total_shops": len(shops),
            "university_towns": [],
            "shops_in_any_buffer": [],
            "shops_outside_all_buffers": []
        }

        for town in university_towns:
            buffer_radius = town.get("radius", default_radius)
            town_data = {
                "name": town["name"],
                "center": {"latitude": town["latitude"], "longitude": town["longitude"]},
                "buffer_radius": buffer_radius,
                "shops_in_buffer": [],
                "shops_count": 0,
                "percentage": 0.0,
                "shop_distances": [],
                "address": town.get("address", ""),
                "description": town.get("description", "")
            }

            for shop in shops:
                distance = self.calculate_distance(
                    town["latitude"], town["longitude"],
                    shop["latitude"], shop["longitude"]
                )
                
                shop["distance_to_town"] = distance
                town_data["shop_distances"].append({
                    "shop_name": shop["name"],
                    "distance": distance,
                    "distance_km": round(distance / 1000, 2),
                    "shop_lat": shop["latitude"],
                    "shop_lon": shop["longitude"]
                })
                
                if distance <= buffer_radius:
                    town_data["shops_in_buffer"].append(shop)
                    town_data["shops_count"] += 1

            if results["total_shops"] > 0:
                town_data["percentage"] = (town_data["shops_count"] / results["total_shops"]) * 100

            if town_data["shops_count"] == 0:
                print(f"\n[DEBUG] {town_data['name']} 缓冲区分析结果为0")
                print(f"  中心坐标: ({town_data['center']['latitude']}, {town_data['center']['longitude']})")
                print(f"  缓冲半径: {buffer_radius}米")
                print(f"  所有门店距离:")
                for dist_info in town_data["shop_distances"]:
                    status = "✗" if dist_info["distance"] > buffer_radius else "✓"
                    print(f"    {status} {dist_info['shop_name']}: {dist_info['distance_km']}km (门店坐标: {dist_info['shop_lat']}, {dist_info['shop_lon']})")

            results["university_towns"].append(town_data)

        all_in_buffer_ids = set()
        for town in results["university_towns"]:
            for shop in town["shops_in_buffer"]:
                all_in_buffer_ids.add(shop["id"])

        for shop in shops:
            if shop["id"] in all_in_buffer_ids:
                results["shops_in_any_buffer"].append(shop)
            else:
                results["shops_outside_all_buffers"].append(shop)

        results["shops_in_any_buffer_count"] = len(results["shops_in_any_buffer"])
        results["shops_outside_all_buffers_count"] = len(results["shops_outside_all_buffers"])
        
        if results["total_shops"] > 0:
            results["overall_percentage"] = (results["shops_in_any_buffer_count"] / results["total_shops"]) * 100
        else:
            results["overall_percentage"] = 0.0

        return results

    def analyze_cbd_buffer(self, shops: List[Dict], cbd_areas: List[Dict], default_radius: int = 2000) -> Dict:
        results = {
            "total_shops": len(shops),
            "cbd_areas": [],
            "shops_in_any_buffer": [],
            "shops_outside_all_buffers": []
        }

        for cbd in cbd_areas:
            buffer_radius = cbd.get("radius", default_radius)
            cbd_data = {
                "name": cbd["name"],
                "center": {"latitude": cbd["latitude"], "longitude": cbd["longitude"]},
                "buffer_radius": buffer_radius,
                "shops_in_buffer": [],
                "shops_count": 0,
                "percentage": 0.0,
                "shop_distances": [],
                "address": cbd.get("address", ""),
                "description": cbd.get("description", "")
            }

            for shop in shops:
                distance = self.calculate_distance(
                    cbd["latitude"], cbd["longitude"],
                    shop["latitude"], shop["longitude"]
                )
                
                shop["distance_to_cbd"] = distance
                cbd_data["shop_distances"].append({
                    "shop_name": shop["name"],
                    "distance": distance,
                    "distance_km": round(distance / 1000, 2),
                    "shop_lat": shop["latitude"],
                    "shop_lon": shop["longitude"]
                })
                
                if distance <= buffer_radius:
                    cbd_data["shops_in_buffer"].append(shop)
                    cbd_data["shops_count"] += 1

            if results["total_shops"] > 0:
                cbd_data["percentage"] = (cbd_data["shops_count"] / results["total_shops"]) * 100

            if cbd_data["shops_count"] == 0:
                print(f"\n[DEBUG] {cbd_data['name']} 缓冲区分析结果为0")
                print(f"  中心坐标: ({cbd_data['center']['latitude']}, {cbd_data['center']['longitude']})")
                print(f"  缓冲半径: {buffer_radius}米")
                print(f"  所有门店距离:")
                for dist_info in cbd_data["shop_distances"]:
                    status = "✗" if dist_info["distance"] > buffer_radius else "✓"
                    print(f"    {status} {dist_info['shop_name']}: {dist_info['distance_km']}km (门店坐标: {dist_info['shop_lat']}, {dist_info['shop_lon']})")

            results["cbd_areas"].append(cbd_data)

        all_in_buffer_ids = set()
        for cbd in results["cbd_areas"]:
            for shop in cbd["shops_in_buffer"]:
                all_in_buffer_ids.add(shop["id"])

        for shop in shops:
            if shop["id"] in all_in_buffer_ids:
                results["shops_in_any_buffer"].append(shop)
            else:
                results["shops_outside_all_buffers"].append(shop)

        results["shops_in_any_buffer_count"] = len(results["shops_in_any_buffer"])
        results["shops_outside_all_buffers_count"] = len(results["shops_outside_all_buffers"])
        
        if results["total_shops"] > 0:
            results["overall_percentage"] = (results["shops_in_any_buffer_count"] / results["total_shops"]) * 100
        else:
            results["overall_percentage"] = 0.0

        return results

    def analyze_tag_distribution(self, shops: List[Dict]) -> Dict:
        tag_stats = {}
        
        for shop in shops:
            tags = shop.get("tags", [])
            for tag in tags:
                if tag not in tag_stats:
                    tag_stats[tag] = {
                        "count": 0,
                        "shops": [],
                        "avg_rating": 0.0,
                        "avg_price": 0.0
                    }
                tag_stats[tag]["count"] += 1
                tag_stats[tag]["shops"].append({
                    "name": shop["name"],
                    "rating": shop["rating"],
                    "price_per_person": shop["price_per_person"]
                })

        for tag in tag_stats:
            shops_with_tag = tag_stats[tag]["shops"]
            if shops_with_tag:
                tag_stats[tag]["avg_rating"] = sum(s["rating"] for s in shops_with_tag) / len(shops_with_tag)
                tag_stats[tag]["avg_price"] = sum(s["price_per_person"] for s in shops_with_tag) / len(shops_with_tag)

        sorted_tags = sorted(tag_stats.items(), key=lambda x: x[1]["count"], reverse=True)
        
        return {
            "total_shops": len(shops),
            "tag_distribution": dict(sorted_tags)
        }

    def generate_comprehensive_analysis(self, shops: List[Dict], university_towns: List[Dict], cbd_areas: List[Dict]) -> Dict:
        ut_analysis = self.analyze_university_town_buffer(shops, university_towns, 3000)
        cbd_analysis = self.analyze_cbd_buffer(shops, cbd_areas, 2000)
        tag_analysis = self.analyze_tag_distribution(shops)

        return {
            "university_town_analysis": ut_analysis,
            "cbd_analysis": cbd_analysis,
            "tag_analysis": tag_analysis
        }

    def print_analysis_report(self, analysis: Dict):
        print("=" * 60)
        print("剧本杀门店空间分布分析报告")
        print("=" * 60)

        print("\n【大学城缓冲区分析 (3公里半径)")
        print("-" * 60)
        ut_data = analysis["university_town_analysis"]
        print(f"门店总数: {ut_data['total_shops']}")
        print(f"任一大学城内门店数: {ut_data['shops_in_any_buffer_count']}")
        print(f"占比: {ut_data['overall_percentage']:.2f}%")
        
        for town in ut_data["university_towns"]:
            print(f"\n  {town['name']}:")
            print(f"    门店数: {town['shops_count']} 家")
            print(f"    占比: {town['percentage']:.2f}%")
            if 'shop_distances' in town:
                for dist_info in town["shop_distances"]:
                    if dist_info['distance'] <= town["buffer_radius"]:
                        print(f"      - {dist_info['shop_name']} (距离: {dist_info['distance_km']:.2f}km)")

        print("\n【CBD缓冲区分析 (2公里半径)")
        print("-" * 60)
        cbd_data = analysis["cbd_analysis"]
        print(f"门店总数: {cbd_data['total_shops']}")
        print(f"任一CBD内门店数: {cbd_data['shops_in_any_buffer_count']}")
        print(f"占比: {cbd_data['overall_percentage']:.2f}%")
        
        for cbd in cbd_data["cbd_areas"]:
            print(f"\n  {cbd['name']}:")
            print(f"    {cbd['shops_count']} 家门店")
            print(f"    占比: {cbd['percentage']:.2f}%")
            if 'shop_distances' in cbd:
                for dist_info in cbd["shop_distances"]:
                    if dist_info['distance'] <= cbd["buffer_radius"]:
                        print(f"      - {dist_info['shop_name']} (距离: {dist_info['distance_km']:.2f}km)")

        print("\n【剧本类型标签分布】")
        print("-" * 60)
        tag_data = analysis["tag_analysis"]
        print(f"门店总数: {tag_data['total_shops']}")
        
        for tag, stats in tag_data["tag_distribution"].items():
            print(f"\n  {tag}:")
            print(f"    门店数: {stats['count']}")
            print(f"    平均评分: {stats['avg_rating']:.2f}")
            print(f"    平均客单价: {stats['avg_price']:.0f}元")

        print("\n" + "=" * 60)

if __name__ == "__main__":
    import sys
    import os
    
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    
    from src.poi.dianping_spider import DianpingSpider
    
    spider = DianpingSpider()
    shops = spider.search_script_killing_shops()
    university_towns = spider.get_university_towns()
    cbd_areas = spider.get_cbd_areas()
    
    analyzer = BufferAnalysis()
    
    print("\n" + "=" * 60)
    print("  数据验证 - 距离计算一致性检查")
    print("=" * 60)
    analyzer.print_validation_report(shops, university_towns, "大学城")
    analyzer.print_validation_report(shops, cbd_areas, "CBD")
    
    print("\n" + "=" * 60)
    print("  综合分析报告")
    print("=" * 60)
    analysis = analyzer.generate_comprehensive_analysis(shops, university_towns, cbd_areas)
    analyzer.print_analysis_report(analysis)
