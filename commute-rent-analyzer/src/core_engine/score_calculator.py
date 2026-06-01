import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from typing import List, Dict
from data_pipeline.gaode_traffic_spider import GaodeTrafficSpider
from data_pipeline.juhe_rent_spider import JuheRentSpider


class ScoreCalculator:
    def __init__(self):
        self.traffic_spider = GaodeTrafficSpider()
        self.rent_spider = JuheRentSpider()

    def normalize(self, value: float, min_val: float, max_val: float) -> float:
        if max_val - min_val == 0:
            return 0.5
        result = (value - min_val) / (max_val - min_val)
        return max(0, min(1, result))

    def calculate_survival_pressure_index(self, area: Dict, budget: float) -> Dict:
        rent_median = area.get("rent_median", 5000)
        commute_minutes = area.get("commute_minutes", 30)
        traffic_index = area.get("traffic_index", 2.0)

        rent_budget_ratio = rent_median / budget
        rent_score = self.normalize(rent_budget_ratio, 0.5, 1.5)
        rent_score = max(0, min(1, rent_score))

        commute_score = self.normalize(commute_minutes, 15, 60)
        commute_score = max(0, min(1, commute_score))

        traffic_score = self.normalize(traffic_index, 1.0, 4.0)
        traffic_score = max(0, min(1, traffic_score))

        weight_rent = 0.5
        weight_commute = 0.35
        weight_traffic = 0.15

        pressure_index = (
            rent_score * weight_rent +
            commute_score * weight_commute +
            traffic_score * weight_traffic
        )

        rent_over_budget = rent_median > budget

        if rent_over_budget:
            pressure_index = max(pressure_index, 0.7)
        elif rent_budget_ratio > 0.9:
            pressure_index = max(pressure_index, 0.5)

        pressure_index = round(pressure_index, 3)

        if pressure_index < 0.3:
            level = "低压力"
            color = "#52c41a"
        elif pressure_index < 0.5:
            level = "中低压力"
            color = "#faad14"
        elif pressure_index < 0.7:
            level = "中高压力"
            color = "#fa8c16"
        else:
            level = "高压力"
            color = "#f5222d"

        return {
            "pressure_index": pressure_index,
            "pressure_level": level,
            "pressure_color": color,
            "rent_score": round(rent_score, 3),
            "commute_score": round(commute_score, 3),
            "traffic_score": round(traffic_score, 3),
            "rent_affordable": rent_median <= budget * 1.2,
            "rent_over_budget": rent_over_budget,
            "commute_reasonable": commute_minutes <= 45,
            "rent_budget_ratio": round(rent_budget_ratio, 2),
        }

    def get_areas_with_scores(self, city: str = "beijing", budget: float = 5000, work_location: str = "center") -> List[Dict]:
        traffic_data = self.traffic_spider.get_areas_traffic_data(city, work_location)
        rent_data = self.rent_spider.get_rent_data(city)

        rent_dict = {item["name"]: item for item in rent_data}

        results = []
        for traffic_item in traffic_data:
            area_name = traffic_item["name"]
            rent_item = rent_dict.get(area_name, {})

            combined_data = {
                **traffic_item,
                **rent_item
            }

            pressure_result = self.calculate_survival_pressure_index(combined_data, budget)

            combined_data.update(pressure_result)
            results.append(combined_data)

        results.sort(key=lambda x: x["pressure_index"])

        return results

    def filter_recommended_areas(self, areas: List[Dict], budget: float) -> List[Dict]:
        recommended = []
        for area in areas:
            if area["rent_median"] <= budget * 1.2 and area["commute_minutes"] <= 50:
                recommended.append(area)
        return recommended


if __name__ == "__main__":
    calculator = ScoreCalculator()
    results = calculator.get_areas_with_scores("beijing", 5000, "wangjing")
    
    print("=" * 60)
    print("生存压力指数排名 (预算: 5000元, 工作地点: 望京)")
    print("=" * 60)
    
    for idx, area in enumerate(results, 1):
        print(f"{idx}. {area['name']}")
        print(f"   租金: {area['rent_median']}元 | 通勤: {area['commute_minutes']}分钟")
        print(f"   压力指数: {area['pressure_index']} [{area['pressure_level']}]")
        print()
