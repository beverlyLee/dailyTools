import json
import os
import re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

WEIGHT_EARLY_MARKET = 0.4
WEIGHT_DAILY_REVIEWS = 0.3
WEIGHT_CATEGORIES = 0.3

MAX_DAILY_REVIEWS = 50
MAX_CATEGORIES = 20


class VitalityScorer:
    def __init__(self, market_data=None):
        self.markets = market_data or []

    def load_from_file(self, filename):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            self.markets = json.load(f)
        return self

    def calculate_all(self):
        scored = []
        for market in self.markets:
            scored_market = self._calculate_one(market)
            scored.append(scored_market)
        return scored

    def _calculate_one(self, market):
        early_market_score = self._calc_early_market_score(market)
        daily_reviews_score = self._calc_daily_reviews_score(market)
        categories_score = self._calc_categories_score(market)

        total_score = (
            early_market_score * WEIGHT_EARLY_MARKET
            + daily_reviews_score * WEIGHT_DAILY_REVIEWS
            + categories_score * WEIGHT_CATEGORIES
        )

        vitality_level = self._get_vitality_level(total_score)

        return {
            **market,
            "early_market_score": round(early_market_score, 2),
            "daily_reviews_score": round(daily_reviews_score, 2),
            "categories_score": round(categories_score, 2),
            "vitality_index": round(total_score, 2),
            "vitality_level": vitality_level,
        }

    def _calc_early_market_score(self, market):
        business_hours = market.get("business_hours", "")
        opens_early = market.get("opens_early", False)

        if not business_hours:
            return 0.3

        open_hour = self._extract_open_hour(business_hours)
        if open_hour is None:
            return 0.5 if opens_early else 0.3

        if open_hour <= 5:
            return 1.0
        elif open_hour <= 6:
            return 0.85
        elif open_hour <= 7:
            return 0.6
        elif open_hour <= 8:
            return 0.4
        else:
            return 0.2

    def _extract_open_hour(self, hours_text):
        if not hours_text:
            return None
        time_pattern = r"(\d{1,2}):(\d{2})"
        matches = re.findall(time_pattern, hours_text)
        if matches:
            return int(matches[0][0])
        return None

    def _calc_daily_reviews_score(self, market):
        review_count = market.get("review_count", 0)
        daily_reviews = review_count / 365
        normalized = min(daily_reviews / MAX_DAILY_REVIEWS, 1.0)
        return normalized

    def _calc_categories_score(self, market):
        category_count = market.get("category_count", 0)
        if category_count == 0 and market.get("categories"):
            category_count = len(market["categories"])
        normalized = min(category_count / MAX_CATEGORIES, 1.0)
        return normalized

    def _get_vitality_level(self, score):
        if score >= 0.8:
            return "高活力"
        elif score >= 0.6:
            return "中高活力"
        elif score >= 0.4:
            return "中等活力"
        elif score >= 0.2:
            return "较低活力"
        else:
            return "低活力"

    def save_scored(self, data, filename="scored_markets.json"):
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"评分结果已保存至: {filepath}")
        return filepath


def main():
    scorer = VitalityScorer()
    scorer.load_from_file("上海_markets.json")
    results = scorer.calculate_all()
    print(f"共计算 {len(results)} 个市场的活力指数")
    for m in results[:5]:
        print(f"{m['name']}: {m['vitality_index']} ({m['vitality_level']})")
    scorer.save_scored(results)


if __name__ == "__main__":
    main()
