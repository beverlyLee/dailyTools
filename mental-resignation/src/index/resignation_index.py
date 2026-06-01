from typing import Dict, List, Any, Optional
from collections import defaultdict


class ResignationIndexBuilder:
    def __init__(self):
        self.industry_weight = 1.0
        self.city_weight = 0.8
        self.time_weight = 0.6
        self.keyword_weight = 1.2
        self.engagement_weight = 0.5

    def build_industry_index(
        self,
        posts: List[Dict[str, Any]],
        keyword_freq: Dict[str, int],
    ) -> List[Dict[str, Any]]:
        industry_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for post in posts:
            industry = post.get("industry", "未知")
            industry_groups[industry].append(post)

        results = []
        max_posts = max((len(v) for v in industry_groups.values()), default=1)

        for industry, group_posts in industry_groups.items():
            volume_score = (len(group_posts) / max_posts) * 40

            industry_keywords = sum(
                1 for p in group_posts
                if any(kw in p.get("content", "") for kw in [
                    "不想上班", "想退休", "精神离职", "想辞职", "干不动"
                ])
            )
            keyword_ratio = industry_keywords / len(group_posts) if group_posts else 0
            keyword_score = keyword_ratio * 40

            avg_engagement = sum(
                p.get("engagement", {}).get("likes", 0)
                + p.get("engagement", {}).get("comments", 0) * 2
                + p.get("engagement", {}).get("shares", 0) * 3
                for p in group_posts
            ) / len(group_posts) if group_posts else 0
            engagement_score = min(avg_engagement / 20, 20)

            score = round(volume_score + keyword_score + engagement_score, 1)
            score = max(20, min(95, score))

            risk = "高" if score >= 75 else ("中" if score >= 55 else "低")

            results.append({
                "industry": industry,
                "resignation_index": score,
                "risk_level": risk,
                "post_count": len(group_posts),
                "keyword_ratio": round(keyword_ratio, 3),
                "avg_engagement": round(avg_engagement, 1),
                "turnover_risk": self._estimate_turnover_risk(score),
            })

        results.sort(key=lambda x: x["resignation_index"], reverse=True)
        return results

    def build_city_index(
        self, posts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        city_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for post in posts:
            city = post.get("city", "未知")
            city_groups[city].append(post)

        results = []
        max_posts = max((len(v) for v in city_groups.values()), default=1)

        for city, group_posts in city_groups.items():
            volume_score = (len(group_posts) / max_posts) * 40

            negative_count = sum(
                1 for p in group_posts
                if any(kw in p.get("content", "") for kw in [
                    "不想上班", "想退休", "精神离职", "想辞职", "干不动", "心累"
                ])
            )
            neg_ratio = negative_count / len(group_posts) if group_posts else 0
            sentiment_score = neg_ratio * 45

            avg_engagement = sum(
                p.get("engagement", {}).get("likes", 0)
                + p.get("engagement", {}).get("comments", 0)
                for p in group_posts
            ) / len(group_posts) if group_posts else 0
            engagement_score = min(avg_engagement / 10, 15)

            score = round(volume_score + sentiment_score + engagement_score, 1)
            score = max(15, min(92, score))

            results.append({
                "city": city,
                "resignation_index": score,
                "post_count": len(group_posts),
                "negative_ratio": round(neg_ratio, 3),
                "avg_engagement": round(avg_engagement, 1),
            })

        results.sort(key=lambda x: x["resignation_index"], reverse=True)
        return results

    def build_time_heatmap(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        slots = [
            "09-10", "10-11", "11-12",
            "12-13", "13-14", "14-15",
            "15-16", "16-17", "17-18",
            "18-19", "19-20", "20-21",
        ]

        matrix = [[0] * len(slots) for _ in range(len(weekdays))]

        for post in posts:
            wd = post.get("weekday", "周一")
            hour = post.get("hour", 9)
            if wd in weekdays and 9 <= hour < 21:
                w_idx = weekdays.index(wd)
                s_idx = min(hour - 9, len(slots) - 1)
                matrix[w_idx][s_idx] += 1

        peak_info = self._find_peaks(matrix, weekdays, slots)

        return {
            "weekdays": weekdays,
            "time_slots": slots,
            "heatmap_matrix": matrix,
            "peak_hours": peak_info,
        }

    def _find_peaks(
        self, matrix: List[List[int]], weekdays: List[str], slots: List[str]
    ) -> List[Dict[str, Any]]:
        peaks = []
        for i, day in enumerate(weekdays):
            for j, slot in enumerate(slots):
                val = matrix[i][j]
                if val >= 15:
                    peaks.append({
                        "weekday": day,
                        "time_slot": f"{slot}:00",
                        "intensity": val,
                        "is_peak": val >= max(max(row) for row in matrix) * 0.7,
                    })
        peaks.sort(key=lambda x: x["intensity"], reverse=True)
        return peaks[:5]

    def _estimate_turnover_risk(self, score: float) -> str:
        if score >= 85:
            return "极高 - 预计3个月内人员流失率>30%"
        elif score >= 75:
            return "高 - 预计3个月内人员流失率15-30%"
        elif score >= 55:
            return "中 - 预计3个月内人员流失率5-15%"
        else:
            return "低 - 预计3个月内人员流失率<5%"

    def compute_overall_index(
        self,
        industry_index: List[Dict[str, Any]],
        city_index: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        if not industry_index:
            return {}

        top_industries = industry_index[:3]
        top_cities = city_index[:3] if city_index else []

        avg_industry = sum(
            i["resignation_index"] for i in industry_index
        ) / len(industry_index) if industry_index else 0

        overall = round(avg_industry, 1)

        return {
            "overall_resignation_index": overall,
            "market_status": (
                "🔥 精神离职热潮汹涌" if overall >= 70
                else "⚠️ 精神离职倾向明显" if overall >= 55
                else "😐 精神离职状态平稳"
            ),
            "top_risk_industries": [
                {"industry": i["industry"], "score": i["resignation_index"]}
                for i in top_industries
            ],
            "top_risk_cities": [
                {"city": c["city"], "score": c["resignation_index"]}
                for c in top_cities
            ],
            "recommendation": (
                "建议重点关注IT互联网及广告营销行业的人员留存策略"
                if overall >= 70
                else "建议关注行业动态，提前做好人才储备"
            ),
        }
