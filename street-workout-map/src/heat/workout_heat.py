import json
import os
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

WEIGHT_MENTION_COUNT = 0.4
WEIGHT_TOTAL_LIKES = 0.3
WEIGHT_EQUIPMENT_QUALITY = 0.2
WEIGHT_EQUIPMENT_COUNT = 0.1

MAX_MENTION_COUNT = 10
MAX_TOTAL_LIKES = 10000


class WorkoutHeatCalculator:
    def __init__(self):
        self.locations = []
        self.heat_data = []

    def load_social_data(self, social_posts):
        location_groups = defaultdict(list)
        for post in social_posts:
            if post.get("location_name"):
                location_groups[post["location_name"]].append(post)
        
        self.location_posts = dict(location_groups)
        return self

    def load_poi_data(self, poi_verified_locations):
        self.poi_locations = poi_verified_locations
        return self

    def calculate_heat(self):
        poi_map = {}
        
        for loc in self.poi_locations:
            verification = loc.get("verification", {})
            if not verification.get("valid"):
                continue
            
            poi_info = verification.get("poi_info", {})
            poi_id = poi_info.get("id", "")
            location_name = poi_info.get("name", loc.get("name", ""))
            
            key = poi_id if poi_id else location_name
            
            if key not in poi_map:
                poi_map[key] = {
                    "poi_info": poi_info,
                    "verification": verification,
                    "posts": []
                }
        
        for loc_name, posts in self.location_posts.items():
            found_key = None
            for key, item in poi_map.items():
                if item["poi_info"].get("name") == loc_name:
                    found_key = key
                    break
            
            if found_key:
                poi_map[found_key]["posts"].extend(posts)
        
        results = []
        for key, item in poi_map.items():
            poi_info = item["poi_info"]
            verification = item["verification"]
            posts = item["posts"]
            
            location_name = poi_info.get("name", "")
            
            mention_count = len(posts)
            total_likes = sum(p.get("likes", 0) for p in posts)
            
            equipment_condition = poi_info.get("equipment_condition", "fair")
            condition_score = self._get_condition_score(equipment_condition)
            
            equipment_count = poi_info.get("equipment_count", 0)
            has_fitness = verification.get("has_fitness_equipment", False)
            
            heat_score = self._compute_heat_score(
                mention_count,
                total_likes,
                condition_score,
                equipment_count
            )
            
            heat_level = self._get_heat_level(heat_score)
            
            all_images = []
            for p in posts:
                all_images.extend(p.get("images", []))
            
            post_summaries = []
            for p in posts:
                post_summaries.append({
                    "title": p.get("post_title", p.get("title", "")),
                    "author": p.get("author", ""),
                    "likes": p.get("likes", 0),
                    "images": p.get("images", []),
                    "content": p.get("post_content", p.get("content", ""))
                })
            
            result = {
                "id": poi_info.get("id", ""),
                "name": location_name,
                "latitude": poi_info.get("latitude"),
                "longitude": poi_info.get("longitude"),
                "address": poi_info.get("address", ""),
                "type": poi_info.get("type_name", ""),
                "is_park": verification.get("is_park", False),
                "has_fitness_equipment": has_fitness,
                "fitness_tags": poi_info.get("fitness_tags", []),
                "equipment_count": equipment_count,
                "equipment_condition": equipment_condition,
                "equipment_condition_label": self._get_condition_label(equipment_condition),
                "mention_count": mention_count,
                "total_likes": total_likes,
                "heat_score": round(heat_score, 2),
                "heat_level": heat_level,
                "posts": post_summaries,
                "images": all_images,
                "district": poi_info.get("district", "")
            }
            results.append(result)
        
        results.sort(key=lambda x: x["heat_score"], reverse=True)
        self.heat_data = results
        return results

    def _compute_heat_score(self, mention_count, total_likes, condition_score, equipment_count):
        mention_score = min(mention_count / MAX_MENTION_COUNT, 1.0)
        likes_score = min(total_likes / MAX_TOTAL_LIKES, 1.0)
        count_score = min(equipment_count / 15.0, 1.0)
        
        total = (
            mention_score * WEIGHT_MENTION_COUNT +
            likes_score * WEIGHT_TOTAL_LIKES +
            condition_score * WEIGHT_EQUIPMENT_QUALITY +
            count_score * WEIGHT_EQUIPMENT_COUNT
        )
        
        return max(0.0, min(1.0, total))

    def _get_condition_score(self, condition):
        scores = {
            "excellent": 1.0,
            "good": 0.8,
            "fair": 0.5,
            "poor": 0.3,
            "broken": 0.1
        }
        return scores.get(condition, 0.5)

    def _get_condition_label(self, condition):
        labels = {
            "excellent": "崭新",
            "good": "良好",
            "fair": "一般",
            "poor": "老旧",
            "broken": "损坏"
        }
        return labels.get(condition, "未知")

    def _get_heat_level(self, score):
        if score >= 0.8:
            return "超高热度"
        elif score >= 0.6:
            return "高热度"
        elif score >= 0.4:
            return "中等热度"
        elif score >= 0.2:
            return "低热度"
        else:
            return "极低热度"

    def get_top_locations(self, top_n=10):
        return self.heat_data[:top_n]

    def get_by_district(self):
        district_data = defaultdict(list)
        for loc in self.heat_data:
            district = loc.get("district", "未知")
            district_data[district].append(loc)
        return dict(district_data)

    def save_results(self, filename="workout_heat_data.json"):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.heat_data, f, ensure_ascii=False, indent=2)
        print(f"热度数据已保存至: {filepath}")
        return filepath


def main():
    from src.social.fitness_topic_spider import FitnessTopicSpider
    from src.poi.park_facility_checker import ParkFacilityChecker
    
    spider = FitnessTopicSpider(city="上海", use_mock=True)
    posts = spider.crawl()
    locations = spider.extract_locations()
    
    checker = ParkFacilityChecker(use_mock=True)
    verified = checker.batch_verify(locations)
    
    heat_calc = WorkoutHeatCalculator()
    heat_calc.load_social_data(posts)
    heat_calc.load_poi_data(verified)
    
    results = heat_calc.calculate_heat()
    print(f"共计算 {len(results)} 个健身点的热度")
    
    print("\n热度TOP5:")
    for i, loc in enumerate(results[:5], 1):
        print(f"{i}. {loc['name']} - {loc['heat_level']} ({loc['heat_score']})")
        print(f"   提及{loc['mention_count']}次 | 总点赞{loc['total_likes']} | 器材{loc['equipment_condition_label']}")
    
    heat_calc.save_results()


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(BASE_DIR)))
    main()
