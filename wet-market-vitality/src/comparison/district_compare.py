import json
import os
from collections import defaultdict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

OLD_DISTRICTS = ["黄浦区", "静安区", "虹口区", "杨浦区", "普陀区", "长宁区", "徐汇区"]
NEW_DEVELOPMENT_AREAS = ["浦东新区", "闵行区", "宝山区", "嘉定区", "松江区", "青浦区", "奉贤区"]


class DistrictCompare:
    def __init__(self, scored_data=None):
        self.markets = scored_data or []

    def load_from_file(self, filename="scored_markets.json"):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            self.markets = json.load(f)
        return self

    def group_by_district(self):
        district_data = defaultdict(list)
        for market in self.markets:
            district = market.get("district", "未知区域")
            district_data[district].append(market)
        return dict(district_data)

    def district_summary(self):
        district_data = self.group_by_district()
        summary = {}
        for district, markets in district_data.items():
            if not markets:
                continue
            avg_vitality = sum(m["vitality_index"] for m in markets) / len(markets)
            avg_early_score = sum(m["early_market_score"] for m in markets) / len(markets)
            avg_review_score = sum(m["daily_reviews_score"] for m in markets) / len(markets)
            avg_category_score = sum(m["categories_score"] for m in markets) / len(markets)

            early_market_count = sum(1 for m in markets if m.get("opens_early", False))
            traditional_count = sum(1 for m in markets if m.get("category") == "菜市场")
            supermarket_count = sum(1 for m in markets if m.get("category") == "生鲜超市")

            summary[district] = {
                "market_count": len(markets),
                "avg_vitality": round(avg_vitality, 2),
                "avg_early_score": round(avg_early_score, 2),
                "avg_review_score": round(avg_review_score, 2),
                "avg_category_score": round(avg_category_score, 2),
                "early_market_count": early_market_count,
                "traditional_market_count": traditional_count,
                "fresh_supermarket_count": supermarket_count,
                "markets": sorted(markets, key=lambda x: x["vitality_index"], reverse=True),
            }
        return dict(sorted(summary.items(), key=lambda x: x[1]["avg_vitality"], reverse=True))

    def old_vs_new_comparison(self):
        district_summary = self.district_summary()

        old_district_data = {k: v for k, v in district_summary.items() if k in OLD_DISTRICTS}
        new_district_data = {k: v for k, v in district_summary.items() if k in NEW_DEVELOPMENT_AREAS}

        def calc_area_avg(data_dict, key):
            if not data_dict:
                return 0
            total = sum(d[key] for d in data_dict.values())
            return round(total / len(data_dict), 2)

        old_markets_count = sum(d["market_count"] for d in old_district_data.values())
        new_markets_count = sum(d["market_count"] for d in new_district_data.values())

        return {
            "old_districts": {
                "name": "老城区",
                "districts": list(old_district_data.keys()),
                "district_count": len(old_district_data),
                "total_markets": old_markets_count,
                "avg_vitality": calc_area_avg(old_district_data, "avg_vitality"),
                "avg_early_score": calc_area_avg(old_district_data, "avg_early_score"),
                "avg_review_score": calc_area_avg(old_district_data, "avg_review_score"),
                "avg_category_score": calc_area_avg(old_district_data, "avg_category_score"),
                "details": old_district_data,
            },
            "new_developments": {
                "name": "新建商品房区域",
                "districts": list(new_district_data.keys()),
                "district_count": len(new_district_data),
                "total_markets": new_markets_count,
                "avg_vitality": calc_area_avg(new_district_data, "avg_vitality"),
                "avg_early_score": calc_area_avg(new_district_data, "avg_early_score"),
                "avg_review_score": calc_area_avg(new_district_data, "avg_review_score"),
                "avg_category_score": calc_area_avg(new_district_data, "avg_category_score"),
                "details": new_district_data,
            },
        }

    def build_sunburst_data(self):
        comparison = self.old_vs_new_comparison()
        district_summary = self.district_summary()

        children = []
        for district_name, district_info in district_summary.items():
            area_type = "老城区" if district_name in OLD_DISTRICTS else "新建商品房区域"
            market_children = []
            for market in district_info["markets"]:
                market_children.append({
                    "name": market["name"],
                    "value": round(market["vitality_index"] * 100, 1),
                    "vitality_index": market["vitality_index"],
                    "vitality_level": market["vitality_level"],
                    "category": market.get("category", ""),
                    "business_hours": market.get("business_hours", ""),
                    "review_count": market.get("review_count", 0),
                    "itemStyle": {
                        "color": self._vitality_color(market["vitality_index"])
                    }
                })

            children.append({
                "name": district_name,
                "value": round(district_info["avg_vitality"] * 100, 1),
                "area_type": area_type,
                "market_count": district_info["market_count"],
                "avg_vitality": district_info["avg_vitality"],
                "children": market_children,
                "itemStyle": {
                    "color": self._vitality_color(district_info["avg_vitality"])
                }
            })

        return {
            "name": "上海",
            "children": children
        }

    def _vitality_color(self, score):
        if score >= 0.8:
            return "#e74c3c"
        elif score >= 0.6:
            return "#e67e22"
        elif score >= 0.4:
            return "#f1c40f"
        elif score >= 0.2:
            return "#3498db"
        else:
            return "#95a5a6"

    def save_comparison(self, data, filename="district_comparison.json"):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"对比结果已保存至: {filepath}")
        return filepath


def main():
    comparer = DistrictCompare()
    comparer.load_from_file()
    summary = comparer.district_summary()
    print("各行政区菜市场活力指数排名:")
    for district, info in summary.items():
        print(f"  {district}: 平均活力 {info['avg_vitality']} ({info['market_count']}家)")

    comparison = comparer.old_vs_new_comparison()
    print("\n老城 vs 新建商品房区域对比:")
    print(f"  老城区平均活力: {comparison['old_districts']['avg_vitality']}")
    print(f"  新建商品房区域平均活力: {comparison['new_developments']['avg_vitality']}")

    sunburst = comparer.build_sunburst_data()
    comparer.save_comparison(sunburst, "sunburst_data.json")


if __name__ == "__main__":
    main()
