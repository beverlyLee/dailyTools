import re
from collections import Counter
from typing import Dict, List, Any, Optional
from datetime import datetime


class SentimentMiner:
    def __init__(self, keywords: Optional[List[str]] = None):
        from config.crawler_headers import KEYWORDS
        self.keywords = keywords if keywords else KEYWORDS
        self._compiled_patterns = [
            re.compile(re.escape(kw), re.IGNORECASE) for kw in self.keywords
        ]

    def extract_keyword_freq(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        counter: Counter = Counter()
        for post in posts:
            content = post.get("content", "")
            for pattern in self._compiled_patterns:
                matches = pattern.findall(content)
                counter.update(matches)
        return dict(counter.most_common())

    def extract_contexts(
        self, posts: List[Dict[str, Any]], target_kw: str, window: int = 20
    ) -> List[Dict[str, Any]]:
        results = []
        seen_posts: set = set()
        pattern = re.compile(re.escape(target_kw), re.IGNORECASE)
        for post in posts:
            content = post.get("content", "")
            post_id = post.get("id")
            for match in pattern.finditer(content):
                if post_id in seen_posts:
                    break
                seen_posts.add(post_id)
                start = max(0, match.start() - window)
                end = min(len(content), match.end() + window)
                context = content[start:end].strip()
                results.append({
                    "post_id": post_id,
                    "platform": post.get("platform"),
                    "industry": post.get("industry"),
                    "city": post.get("city"),
                    "context": context,
                    "timestamp": post.get("timestamp"),
                })
        return results

    def group_by_time_slot(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        slots = [
            "09:00-10:00", "10:00-11:00", "11:00-12:00",
            "12:00-13:00", "13:00-14:00", "14:00-15:00",
            "15:00-16:00", "16:00-17:00", "17:00-18:00",
            "18:00-19:00", "19:00-20:00", "20:00-21:00",
        ]
        counts: Dict[str, int] = {s: 0 for s in slots}
        for post in posts:
            hour = post.get("hour", 9)
            for slot in slots:
                start_h = int(slot.split("-")[0].split(":")[0])
                end_h = int(slot.split("-")[1].split(":")[0])
                if start_h <= hour < end_h:
                    counts[slot] += 1
                    break
        return counts

    def group_by_weekday(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        counts: Dict[str, int] = {d: 0 for d in weekdays}
        for post in posts:
            wd = post.get("weekday", "周一")
            if wd in counts:
                counts[wd] += 1
        return counts

    def group_by_industry(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        counter: Counter = Counter()
        for post in posts:
            industry = post.get("industry", "未知")
            counter[industry] += 1
        return dict(counter.most_common())

    def group_by_platform(
        self, posts: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        counter: Counter = Counter()
        for post in posts:
            platform = post.get("platform", "未知")
            counter[platform] += 1
        return dict(counter.most_common())

    def compute_engagement_score(
        self, posts: List[Dict[str, Any]]
    ) -> float:
        if not posts:
            return 0.0
        total = 0
        for post in posts:
            eng = post.get("engagement", {})
            total += eng.get("likes", 0) * 1 + eng.get("comments", 0) * 2 + eng.get("shares", 0) * 3
        return round(total / len(posts), 2)

    def detect_peak_hours(
        self, posts: List[Dict[str, Any]], top_n: int = 3
    ) -> List[Dict[str, Any]]:
        time_counts = self.group_by_time_slot(posts)
        sorted_slots = sorted(time_counts.items(), key=lambda x: x[1], reverse=True)
        return [
            {"time_slot": slot, "count": count, "rank": i + 1}
            for i, (slot, count) in enumerate(sorted_slots[:top_n])
        ]

    def full_analysis(self, posts: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "keyword_frequency": self.extract_keyword_freq(posts),
            "time_distribution": self.group_by_time_slot(posts),
            "weekday_distribution": self.group_by_weekday(posts),
            "industry_distribution": self.group_by_industry(posts),
            "platform_distribution": self.group_by_platform(posts),
            "avg_engagement": self.compute_engagement_score(posts),
            "peak_hours": self.detect_peak_hours(posts),
            "total_posts": len(posts),
        }
