import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class FacilityResult:
    name: str
    available: bool
    description: str
    score: float
    keywords: List[str] = field(default_factory=list)


@dataclass
class ScoringResult:
    poi_id: str
    total_score: float
    score_level: str
    facilities: Dict[str, FacilityResult]
    review_snippets: List[str]


FACILITY_KEYWORDS: Dict[str, Dict] = {
    "babyRoom": {
        "name": "母婴室",
        "weight": 0.30,
        "positive": [
            "母婴室", "哺乳室", "育婴室", "母乳喂养室",
            "独立母婴室", "私密母婴室", "干净的母婴室",
            "母婴室宽敞", "母婴室干净", "母婴室设施齐全"
        ],
        "negative": [
            "没有母婴室", "无母婴室", "母婴室缺失",
            "母婴室脏", "母婴室臭", "母婴室无法使用",
            "母婴室门锁坏", "母婴室在维修"
        ],
        "detail_keywords": {
            "有门": "独立房间+有门",
            "有插座": "有电源插座",
            "有洗手台": "有洗手台",
            "有沙发": "有舒适沙发",
            "有空调": "有空调",
            "宽敞": "空间宽敞",
            "干净": "干净整洁"
        }
    },
    "changingTable": {
        "name": "尿布台",
        "weight": 0.20,
        "positive": [
            "尿布台", "换尿布台", "婴儿护理台",
            "有尿布台", "尿布台干净", "尿布台齐全",
            "母婴室有尿布台", "卫生间有尿布台"
        ],
        "negative": [
            "没有尿布台", "无尿布台", "缺少尿布台",
            "尿布台脏", "尿布台坏了", "尿布台无法使用"
        ],
        "detail_keywords": {
            "防护带": "有安全防护带",
            "纸巾": "提供纸巾",
            "湿巾": "提供湿巾",
            "垃圾桶": "有专用垃圾桶"
        }
    },
    "strollerRental": {
        "name": "推车租赁",
        "weight": 0.15,
        "positive": [
            "推车租赁", "婴儿车租赁", "童车租赁",
            "可以租推车", "提供推车", "有推车可租",
            "可以租婴儿车", "提供婴儿车", "有婴儿车可租",
            "推车免费", "推车便宜", "推车很新",
            "婴儿车免费", "婴儿车便宜", "婴儿车很新"
        ],
        "negative": [
            "没有推车租赁", "不能租推车", "无推车",
            "推车太贵", "推车太旧", "推车数量少",
            "推车租赁服务差"
        ],
        "detail_keywords": {
            "免费": "免费租赁",
            "车型多样": "车型多样可选",
            "价格合理": "价格合理",
            "很新": "车辆较新",
            "押金少": "押金低廉"
        }
    },
    "playArea": {
        "name": "儿童乐园",
        "weight": 0.15,
        "positive": [
            "儿童乐园", "游乐场", "游乐区", "淘气堡",
            "儿童游乐", "亲子乐园", "儿童游戏区",
            "儿童乐园大", "游乐设施多", "儿童乐园干净"
        ],
        "negative": [
            "没有儿童乐园", "儿童乐园小", "游乐设施少",
            "儿童乐园脏", "设施坏了", "儿童乐园收费贵",
            "儿童乐园人太多"
        ],
        "detail_keywords": {
            "安全防护": "有安全防护",
            "专人看管": "有专人看管",
            "设施新": "设施较新",
            "免费": "免费游玩"
        }
    },
    "nursingRoom": {
        "name": "哺乳室",
        "weight": 0.20,
        "positive": [
            "哺乳室", "母乳喂养室", "喂奶室",
            "私密哺乳", "可以喂奶", "有专门喂奶的地方",
            "哺乳室舒适", "哺乳室安静"
        ],
        "negative": [
            "没有哺乳室", "只能在厕所喂奶", "只能在外面喂奶",
            "哺乳室人多", "哺乳室不私密"
        ],
        "detail_keywords": {
            "私密空间": "私密空间",
            "舒适座椅": "有舒适座椅",
            "有靠枕": "有靠枕",
            "安静": "环境安静"
        }
    }
}


class FacilityScorer:
    def __init__(self):
        self.facility_config = FACILITY_KEYWORDS

    def analyze_reviews(self, reviews: List[str]) -> Dict[str, List[str]]:
        facility_matches: Dict[str, List[str]] = {}
        for facility_key, config in self.facility_config.items():
            matches = []
            all_keywords = config["positive"] + config["negative"]
            for review in reviews:
                for keyword in all_keywords:
                    if keyword in review:
                        matches.append(review)
                        break
            facility_matches[facility_key] = matches
        return facility_matches

    def extract_snippets(self, reviews: List[str], max_snippets: int = 3) -> List[str]:
        review_snippets = []
        for review in reviews:
            if len(review) > 50:
                snippet = review[:50] + "..."
            else:
                snippet = review
            if snippet not in review_snippets:
                review_snippets.append(snippet)
            if len(review_snippets) >= max_snippets:
                break
        return review_snippets

    def calculate_facility_score(
        self,
        facility_key: str,
        matched_reviews: List[str]
    ) -> Tuple[float, bool, str, List[str]]:
        config = self.facility_config[facility_key]
        positive_count = 0
        negative_count = 0
        matched_keywords = []
        description_parts = []

        for review in matched_reviews:
            for keyword in config["positive"]:
                if keyword in review and keyword not in matched_keywords:
                    positive_count += 1
                    matched_keywords.append(keyword)
            for keyword in config["negative"]:
                if keyword in review and keyword not in matched_keywords:
                    negative_count += 1
                    matched_keywords.append(keyword)

        for detail_keyword, desc in config["detail_keywords"].items():
            if any(detail_keyword in review for review in matched_reviews):
                description_parts.append(desc)

        if positive_count == 0 and negative_count == 0:
            available = False
            score = 0.0
            description = "暂无相关信息"
        elif positive_count >= negative_count:
            available = True
            base_score = 5.0
            detail_bonus = min(len(description_parts) * 1.5, 5.0)
            score = min(base_score + detail_bonus, 10.0)
            description = "、".join(description_parts) if description_parts else "设施可用"
        else:
            available = False
            score = max(2.0 - negative_count * 0.5, 0.0)
            description = "设施缺失或体验较差"

        return round(score, 1), available, description, matched_keywords

    def calculate_total_score(self, facility_scores: Dict[str, float]) -> float:
        total = 0.0
        for facility_key, score in facility_scores.items():
            weight = self.facility_config[facility_key]["weight"]
            total += score * weight
        return round(total, 1)

    def determine_score_level(self, total_score: float) -> str:
        if total_score >= 9.0:
            return "excellent"
        elif total_score >= 7.0:
            return "good"
        elif total_score >= 5.0:
            return "average"
        else:
            return "poor"

    def score_poi(self, poi_id: str, reviews: List[str]) -> ScoringResult:
        facility_matches = self.analyze_reviews(reviews)
        facility_results: Dict[str, FacilityResult] = {}
        facility_scores: Dict[str, float] = {}

        for facility_key, matched_reviews in facility_matches.items():
            config = self.facility_config[facility_key]
            score, available, description, keywords = self.calculate_facility_score(
                facility_key, matched_reviews
            )
            facility_scores[facility_key] = score
            facility_results[facility_key] = FacilityResult(
                name=config["name"],
                available=available,
                description=description,
                score=score,
                keywords=keywords
            )

        total_score = self.calculate_total_score(facility_scores)
        score_level = self.determine_score_level(total_score)
        review_snippets = self.extract_snippets(reviews)

        return ScoringResult(
            poi_id=poi_id,
            total_score=total_score,
            score_level=score_level,
            facilities=facility_results,
            review_snippets=review_snippets
        )

    def to_dict(self, result: ScoringResult) -> Dict:
        return {
            "poi_id": result.poi_id,
            "total_score": result.total_score,
            "score_level": result.score_level,
            "facilities": {
                key: {
                    "name": facility.name,
                    "available": facility.available,
                    "description": facility.description,
                    "score": facility.score
                }
                for key, facility in result.facilities.items()
            },
            "review_snippets": result.review_snippets
        }
