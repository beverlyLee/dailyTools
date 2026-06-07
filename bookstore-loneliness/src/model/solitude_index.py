import re
from typing import List, Dict, Tuple
from dataclasses import dataclass, field

try:
    import jieba
    JIEBA_AVAILABLE = True
except ImportError:
    JIEBA_AVAILABLE = False


SOLITUDE_KEYWORDS_WEIGHTED = {
    "一个人": 1.2,
    "独自": 1.3,
    "单独": 1.0,
    "发呆": 1.1,
    "安静": 0.8,
    "独处": 1.5,
    "放空": 1.0,
    "消磨时间": 0.9,
    "发呆一下午": 1.2,
    "安静地": 0.7,
    "静静的": 0.7,
    "沉浸": 0.8,
    "自己": 0.5,
    "一人": 1.0,
    "孤身": 1.3,
    "独来独往": 1.2,
    "清净": 0.9,
    "静谧": 1.0,
    "孤独": 1.5,
    "寂寞": 1.4,
    "没人打扰": 1.1,
    "与世隔绝": 1.3,
    "角落": 0.6,
    "靠窗": 0.4,
    "一隅": 0.8,
}

FAMILY_KEYWORDS_WEIGHTED = {
    "带孩子": 1.3,
    "带娃": 1.3,
    "亲子": 1.4,
    "小朋友": 1.0,
    "孩子": 0.8,
    "宝宝": 1.1,
    "儿童": 1.2,
    "绘本": 1.0,
    "陪孩子": 1.2,
    "陪娃": 1.2,
    "一家三口": 1.4,
    "全家": 1.1,
    "小孩": 0.9,
    "亲子阅读": 1.5,
    "儿童区": 1.3,
}

STUDENT_KEYWORDS_WEIGHTED = {
    "写作业": 1.3,
    "复习": 1.2,
    "备考": 1.3,
    "考研": 1.4,
    "学生": 1.0,
    "自习": 1.3,
    "学习": 1.0,
    "看书": 0.7,
    "读书": 0.7,
    "写论文": 1.2,
    "做作业": 1.2,
    "功课": 1.0,
    "学霸": 0.9,
    "期末": 1.0,
    "图书馆": 0.8,
}

INTERNET_FAMOUS_KEYWORDS_WEIGHTED = {
    "拍照": 1.3,
    "打卡": 1.4,
    "网红": 1.5,
    "出片": 1.3,
    "ins风": 1.4,
    "文艺": 0.8,
    "装修": 1.0,
    "设计感": 1.1,
    "颜值": 1.2,
    "适合拍照": 1.4,
    "咖啡店": 1.0,
    "下午茶": 1.1,
    "朋友圈": 0.9,
    "探店": 1.1,
    "复古": 0.8,
    "小资": 0.9,
    "氛围感": 1.2,
}


@dataclass
class SolitudeIndexResult:
    bookstore_id: str
    bookstore_name: str
    solitude_score: float = 0.0
    family_score: float = 0.0
    student_score: float = 0.0
    internet_famous_score: float = 0.0
    total_reviews: int = 0
    keyword_counts: Dict[str, int] = field(default_factory=dict)
    normalized_solitude: float = 0.0


class SolitudeIndexCalculator:
    def __init__(self, use_jieba: bool = True):
        self.use_jieba = use_jieba and JIEBA_AVAILABLE
        self.solitude_keywords = SOLITUDE_KEYWORDS_WEIGHTED
        self.family_keywords = FAMILY_KEYWORDS_WEIGHTED
        self.student_keywords = STUDENT_KEYWORDS_WEIGHTED
        self.internet_famous_keywords = INTERNET_FAMOUS_KEYWORDS_WEIGHTED

    def _tokenize(self, text: str) -> List[str]:
        if self.use_jieba:
            return list(jieba.cut(text))
        else:
            return self._simple_tokenize(text)

    def _simple_tokenize(self, text: str) -> List[str]:
        tokens = []
        all_keywords = (
            list(self.solitude_keywords.keys()) +
            list(self.family_keywords.keys()) +
            list(self.student_keywords.keys()) +
            list(self.internet_famous_keywords.keys())
        )
        all_keywords.sort(key=len, reverse=True)

        remaining = text
        for kw in all_keywords:
            if kw in remaining:
                count = remaining.count(kw)
                tokens.extend([kw] * count)
                remaining = remaining.replace(kw, "")

        return tokens

    def _count_keywords(self, text: str, keyword_dict: Dict[str, float]) -> Tuple[float, Dict[str, int]]:
        total_score = 0.0
        counts = {}

        for keyword, weight in keyword_dict.items():
            count = text.count(keyword)
            if count > 0:
                counts[keyword] = count
                total_score += count * weight

        return total_score, counts

    def calculate_from_reviews(self, reviews: List, bookstore_id: str = "",
                                bookstore_name: str = "") -> SolitudeIndexResult:
        if not reviews:
            return SolitudeIndexResult(
                bookstore_id=bookstore_id,
                bookstore_name=bookstore_name
            )

        all_content = " ".join([r.content for r in reviews])

        solitude_score, solitude_counts = self._count_keywords(
            all_content, self.solitude_keywords
        )
        family_score, family_counts = self._count_keywords(
            all_content, self.family_keywords
        )
        student_score, student_counts = self._count_keywords(
            all_content, self.student_keywords
        )
        internet_famous_score, internet_famous_counts = self._count_keywords(
            all_content, self.internet_famous_keywords
        )

        all_counts = {}
        all_counts.update(solitude_counts)
        all_counts.update(family_counts)
        all_counts.update(student_counts)
        all_counts.update(internet_famous_counts)

        total_weighted = solitude_score + family_score + student_score + internet_famous_score

        if total_weighted > 0:
            normalized_solitude = solitude_score / total_weighted
        else:
            normalized_solitude = 0.0

        avg_per_review = solitude_score / len(reviews) if reviews else 0.0

        result = SolitudeIndexResult(
            bookstore_id=bookstore_id,
            bookstore_name=bookstore_name,
            solitude_score=round(solitude_score, 2),
            family_score=round(family_score, 2),
            student_score=round(student_score, 2),
            internet_famous_score=round(internet_famous_score, 2),
            total_reviews=len(reviews),
            keyword_counts=all_counts,
            normalized_solitude=round(normalized_solitude, 4)
        )

        return result

    def calculate_batch(self, bookstores: List) -> List[SolitudeIndexResult]:
        results = []
        for bookstore in bookstores:
            result = self.calculate_from_reviews(
                bookstore.reviews,
                bookstore_id=bookstore.bookstore_id,
                bookstore_name=bookstore.name
            )
            results.append(result)
        return results

    def get_solitude_ranking(self, results: List[SolitudeIndexResult],
                              top_n: int = 10) -> List[SolitudeIndexResult]:
        sorted_results = sorted(
            results,
            key=lambda x: x.normalized_solitude,
            reverse=True
        )
        return sorted_results[:top_n]

    def analyze_city_solitude(self, results: List[SolitudeIndexResult]) -> Dict:
        if not results:
            return {"avg_solitude": 0, "high_solitude_count": 0, "distribution": {}}

        total_solitude = sum(r.normalized_solitude for r in results)
        avg_solitude = total_solitude / len(results)

        high_solitude = sum(1 for r in results if r.normalized_solitude >= 0.4)
        mid_solitude = sum(1 for r in results if 0.2 <= r.normalized_solitude < 0.4)
        low_solitude = sum(1 for r in results if r.normalized_solitude < 0.2)

        distribution = {
            "high": high_solitude,
            "medium": mid_solitude,
            "low": low_solitude
        }

        return {
            "avg_solitude": round(avg_solitude, 4),
            "high_solitude_count": high_solitude,
            "total_bookstores": len(results),
            "distribution": distribution
        }
