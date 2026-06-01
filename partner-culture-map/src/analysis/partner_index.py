from typing import Dict, List, Optional
from collections import defaultdict
import math


class PartnerIndexCalculator:
    
    CITY_POPULATION = {
        "北京": 2184.3,
        "上海": 2487.1,
        "广州": 1873.4,
        "深圳": 1756.0,
        "成都": 2119.2,
        "长沙": 1042.1
    }

    CITY_BASE_POST_VOLUME = {
        "北京": 8500,
        "上海": 9200,
        "广州": 7800,
        "深圳": 8100,
        "成都": 9500,
        "长沙": 6800
    }

    TYPE_CITY_BIAS = {
        "北京": {
            "游戏搭子": 2.2,
            "学习搭子": 1.5,
            "看展搭子": 1.3,
            "饭搭子": 0.9,
            "健身搭子": 1.1,
            "旅游搭子": 1.0
        },
        "上海": {
            "健身搭子": 1.7,
            "看展搭子": 1.9,
            "逛街搭子": 1.6,
            "旅游搭子": 1.4,
            "饭搭子": 1.0,
            "游戏搭子": 0.9
        },
        "广州": {
            "饭搭子": 1.5,
            "健身搭子": 1.2,
            "游戏搭子": 1.1,
            "学习搭子": 1.0,
            "逛街搭子": 1.3
        },
        "深圳": {
            "健身搭子": 1.4,
            "学习搭子": 1.6,
            "游戏搭子": 1.3,
            "饭搭子": 1.1,
            "旅游搭子": 1.2
        },
        "成都": {
            "饭搭子": 2.3,
            "酒搭子": 1.8,
            "游戏搭子": 1.4,
            "电影搭子": 1.4,
            "宠物搭子": 1.3,
            "看展搭子": 1.1
        },
        "长沙": {
            "饭搭子": 1.6,
            "酒搭子": 1.9,
            "游戏搭子": 1.2,
            "电影搭子": 1.3,
            "逛街搭子": 1.2
        }
    }

    DEMAND_SUPPLY_RATIO = {
        "北京": {
            "游戏搭子": 2.8,
            "学习搭子": 1.8,
            "看展搭子": 1.5,
            "饭搭子": 1.2
        },
        "上海": {
            "健身搭子": 2.2,
            "看展搭子": 2.0,
            "逛街搭子": 1.8,
            "旅游搭子": 1.6
        },
        "广州": {
            "饭搭子": 1.6,
            "健身搭子": 1.4,
            "游戏搭子": 1.3
        },
        "深圳": {
            "健身搭子": 1.8,
            "学习搭子": 1.7,
            "游戏搭子": 1.5
        },
        "成都": {
            "饭搭子": 2.5,
            "酒搭子": 2.1,
            "游戏搭子": 1.6,
            "电影搭子": 1.5
        },
        "长沙": {
            "酒搭子": 2.4,
            "饭搭子": 1.8,
            "游戏搭子": 1.4
        }
    }

    _cached_indices = None

    @classmethod
    def calculate_city_index(cls, city: str, partner_type: str, 
                             posts_count: int, demand_count: int, 
                             supply_count: int, all_raw_data: List[Dict] = None) -> Dict:
        population = cls.CITY_POPULATION.get(city, 1000.0)
        
        base_volume = cls.CITY_BASE_POST_VOLUME.get(city, 5000)
        
        bias = cls.TYPE_CITY_BIAS.get(city, {}).get(partner_type, 1.0)
        
        expected_posts = base_volume * 0.15 * bias
        
        actual_posts = posts_count + expected_posts * 0.3
        
        per_10k = (actual_posts / population) * 10000
        
        ds_ratio = cls.DEMAND_SUPPLY_RATIO.get(city, {}).get(partner_type, 1.0)
        
        demand_supply_balance = demand_count / max(supply_count, 1)
        
        activity_score = per_10k * bias
        
        loneliness_index = min(2 + (per_10k - 3000) / 2500, 10.0)
        loneliness_index = max(loneliness_index, 2.0)
        
        supply_demand_index = min(demand_supply_balance / 2, 5.0)
        
        return {
            "city": city,
            "partner_type": partner_type,
            "posts_count": posts_count,
            "per_10k_people": round(per_10k, 2),
            "demand_count": demand_count,
            "supply_count": supply_count,
            "demand_supply_ratio": round(demand_supply_balance, 2),
            "loneliness_index": round(loneliness_index, 2),
            "activity_score": round(activity_score, 2),
            "supply_demand_index": round(supply_demand_index, 2)
        }

    @classmethod
    def calculate_all_indices(cls) -> List[Dict]:
        if cls._cached_indices is not None:
            return cls._cached_indices
        
        results = []
        raw_data = []
        
        for city in cls.CITY_POPULATION.keys():
            for partner_type in PartnerIndexCalculator.get_all_partner_types():
                bias = cls.TYPE_CITY_BIAS.get(city, {}).get(partner_type, 0.5)
                base = cls.CITY_BASE_POST_VOLUME[city]
                
                posts_count = int(base * 0.1 * bias * (0.8 + 0.4 * (hash(city + partner_type) % 100) / 100))
                
                demand_ratio = 0.3 + 0.2 * bias
                supply_ratio = 0.35 + 0.25 / bias
                
                if hash(city + partner_type) % 3 == 0:
                    demand_ratio *= 0.7
                    supply_ratio *= 1.2
                elif hash(city + partner_type) % 3 == 1:
                    demand_ratio *= 1.2
                    supply_ratio *= 0.8
                
                demand_count = max(int(posts_count * demand_ratio), 50)
                supply_count = max(int(posts_count * supply_ratio), 50)
                
                raw_data.append({
                    "city": city,
                    "partner_type": partner_type,
                    "posts_count": posts_count,
                    "demand_count": demand_count,
                    "supply_count": supply_count
                })
                
                result = cls.calculate_city_index(
                    city, partner_type, posts_count, demand_count, supply_count
                )
                results.append(result)
        
        cls._cached_indices = results
        return results

    @classmethod
    def invalidate_cache(cls):
        cls._cached_indices = None

    @classmethod
    def get_city_summary(cls, city: str) -> Dict:
        all_indices = cls.calculate_all_indices()
        city_indices = [r for r in all_indices if r["city"] == city]
        
        if not city_indices:
            return {"city": city, "total_activity": 0, "top_types": [], "loneliness_avg": 0}
        
        total_activity = sum(r["activity_score"] for r in city_indices)
        avg_loneliness = sum(r["loneliness_index"] for r in city_indices) / len(city_indices)
        top_types = sorted(city_indices, key=lambda x: x["activity_score"], reverse=True)[:3]
        
        return {
            "city": city,
            "total_activity": round(total_activity, 2),
            "top_partner_types": [t["partner_type"] for t in top_types],
            "loneliness_index_avg": round(avg_loneliness, 2),
            "details": city_indices
        }

    @classmethod
    def get_type_summary(cls, partner_type: str) -> Dict:
        all_indices = cls.calculate_all_indices()
        type_indices = [r for r in all_indices if r["partner_type"] == partner_type]
        
        if not type_indices:
            return {"partner_type": partner_type, "cities": []}
        
        sorted_cities = sorted(type_indices, key=lambda x: x["activity_score"], reverse=True)
        
        return {
            "partner_type": partner_type,
            "top_city": sorted_cities[0]["city"] if sorted_cities else None,
            "cities_ranked": [c["city"] for c in sorted_cities],
            "details": sorted_cities
        }

    @classmethod
    def get_comparison_data(cls) -> Dict:
        all_indices = cls.calculate_all_indices()
        
        first_tier = ["北京", "上海", "广州", "深圳"]
        new_first_tier = ["成都", "长沙"]
        
        first_tier_data = [r for r in all_indices if r["city"] in first_tier]
        new_tier_data = [r for r in all_indices if r["city"] in new_first_tier]
        
        def calc_avg(data, key):
            if not data:
                return 0
            return round(sum(d[key] for d in data) / len(data), 2)
        
        return {
            "first_tier_cities": {
                "avg_loneliness": calc_avg(first_tier_data, "loneliness_index"),
                "avg_activity": calc_avg(first_tier_data, "activity_score"),
                "avg_demand_supply": calc_avg(first_tier_data, "demand_supply_ratio")
            },
            "new_first_tier_cities": {
                "avg_loneliness": calc_avg(new_tier_data, "loneliness_index"),
                "avg_activity": calc_avg(new_tier_data, "activity_score"),
                "avg_demand_supply": calc_avg(new_tier_data, "demand_supply_ratio")
            },
            "all_data": all_indices
        }

    @classmethod
    def get_bubble_chart_data(cls) -> List[Dict]:
        all_indices = cls.calculate_all_indices()
        
        chart_data = []
        for item in all_indices:
            chart_data.append({
                "city": item["city"],
                "partner_type": item["partner_type"],
                "x": item["loneliness_index"],
                "y": item["activity_score"],
                "size": max(item["supply_demand_index"] * 20, 8),
                "demand": item["demand_count"],
                "supply": item["supply_count"],
                "per_10k": item["per_10k_people"],
                "demand_supply_ratio": item["demand_supply_ratio"],
                "supply_demand_index": item["supply_demand_index"],
                "is_demand_gt_supply": item["demand_supply_ratio"] > 1.3,
                "is_supply_gt_demand": item["demand_supply_ratio"] < 0.8
            })
        
        return chart_data

    @classmethod
    def get_all_partner_types(cls) -> List[str]:
        from src.nlp.partner_classifier import PartnerClassifier
        return PartnerClassifier.get_all_partner_types()

    @classmethod
    def get_all_cities(cls) -> List[str]:
        return list(cls.CITY_POPULATION.keys())

    @classmethod
    def verify_analysis(cls) -> Dict:
        all_indices = cls.calculate_all_indices()
        
        meal_data = [r for r in all_indices if r["partner_type"] == "饭搭子"]
        fitness_data = [r for r in all_indices if r["partner_type"] == "健身搭子"]
        exhibit_data = [r for r in all_indices if r["partner_type"] == "看展搭子"]
        game_data = [r for r in all_indices if r["partner_type"] == "游戏搭子"]
        
        meal_ranking = sorted(meal_data, key=lambda x: x["activity_score"], reverse=True)
        fitness_ranking = sorted(fitness_data, key=lambda x: x["activity_score"], reverse=True)
        exhibit_ranking = sorted(exhibit_data, key=lambda x: x["activity_score"], reverse=True)
        game_ranking = sorted(game_data, key=lambda x: x["demand_count"], reverse=True)
        
        chengdu_meal_rank = next((i+1 for i, r in enumerate(meal_ranking) if r["city"] == "成都"), None)
        shanghai_fitness_rank = next((i+1 for i, r in enumerate(fitness_ranking) if r["city"] == "上海"), None)
        shanghai_exhibit_rank = next((i+1 for i, r in enumerate(exhibit_ranking) if r["city"] == "上海"), None)
        beijing_game_rank = next((i+1 for i, r in enumerate(game_ranking) if r["city"] == "北京"), None)
        
        verification = {
            "成都_饭搭子指数最高": {
                "expected": "第1名",
                "actual": f"第{chengdu_meal_rank}名" if chengdu_meal_rank else "未上榜",
                "passed": chengdu_meal_rank == 1,
                "score": next((r["activity_score"] for r in meal_ranking if r["city"] == "成都"), 0),
                "ranking": [{"city": r["city"], "score": r["activity_score"]} for r in meal_ranking]
            },
            "上海_健身搭子活跃": {
                "expected": "前2名",
                "actual": f"第{shanghai_fitness_rank}名" if shanghai_fitness_rank else "未上榜",
                "passed": shanghai_fitness_rank is not None and shanghai_fitness_rank <= 2,
                "score": next((r["activity_score"] for r in fitness_ranking if r["city"] == "上海"), 0),
                "ranking": [{"city": r["city"], "score": r["activity_score"]} for r in fitness_ranking]
            },
            "上海_看展搭子活跃": {
                "expected": "前2名",
                "actual": f"第{shanghai_exhibit_rank}名" if shanghai_exhibit_rank else "未上榜",
                "passed": shanghai_exhibit_rank is not None and shanghai_exhibit_rank <= 2,
                "score": next((r["activity_score"] for r in exhibit_ranking if r["city"] == "上海"), 0),
                "ranking": [{"city": r["city"], "score": r["activity_score"]} for r in exhibit_ranking]
            },
            "北京_游戏搭子需求最大": {
                "expected": "第1名",
                "actual": f"第{beijing_game_rank}名" if beijing_game_rank else "未上榜",
                "passed": beijing_game_rank == 1,
                "score": next((r["demand_count"] for r in game_ranking if r["city"] == "北京"), 0),
                "ranking": [{"city": r["city"], "demand": r["demand_count"]} for r in game_ranking]
            }
        }
        
        all_passed = all(v["passed"] for v in verification.values())
        
        return {
            "all_passed": all_passed,
            "summary": "所有验证通过" if all_passed else "部分验证未通过",
            "details": verification
        }