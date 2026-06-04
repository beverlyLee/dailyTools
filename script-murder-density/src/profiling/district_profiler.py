import os
import json
from typing import List, Dict, Optional
from collections import defaultdict


class DistrictProfiler:
    def __init__(self):
        self.dimension_map = {
            "硬核推理": ["硬核推理", "本格推理", "变格推理", "推理", "解谜", "沉浸剧场"],
            "恐怖惊悚": ["恐怖惊悚", "恐怖", "惊悚", "鬼屋", "暗黑", "NPC互动"],
            "欢乐机制": ["欢乐机制", "欢乐", "机制", "派对游戏", "轻松休闲", "搞笑"],
            "情感沉浸": ["情感沉浸", "情感", "沉浸", "古风本", "情感本", "治愈"],
            "阵营对抗": ["阵营对抗", "阵营", "对抗", "机制本", "竞技", "策略"],
        }
        self.cluster_labels = {
            0: "硬核推理区",
            1: "恐怖惊悚区",
            2: "欢乐机制区",
            3: "情感沉浸区",
            4: "阵营对抗区",
        }
        self.cluster_colors = {
            0: "#e74c3c",
            1: "#8e44ad",
            2: "#f39c12",
            3: "#3498db",
            4: "#2ecc71",
        }

    def profile_city(self, shops: List[Dict], city: str) -> Dict:
        city_shops = [s for s in shops if s.get("city") == city]
        if not city_shops:
            return {"city": city, "districts": {}, "summary": {}}

        district_data = defaultdict(list)
        for shop in city_shops:
            district = shop.get("district", "未知")
            district_data[district].append(shop)

        district_profiles = {}
        for district, d_shops in district_data.items():
            profile = self._build_district_profile(district, d_shops)
            district_profiles[district] = profile

        city_summary = self._build_city_summary(city, city_shops, district_profiles)

        return {
            "city": city,
            "districts": district_profiles,
            "summary": city_summary,
        }

    def _build_district_profile(self, district: str, shops: List[Dict]) -> Dict:
        dimensions = list(self.dimension_map.keys())
        scores = {d: 0 for d in dimensions}

        for shop in shops:
            tags = shop.get("tags", [])
            for dim, keywords in self.dimension_map.items():
                for tag in tags:
                    if any(kw in tag for kw in keywords):
                        scores[dim] += 1

        total_tags = sum(scores.values()) or 1
        style_index = {d: round(scores[d] / total_tags * 100, 1) for d in dimensions}

        avg_price = sum(s.get("avg_price", 0) for s in shops) / len(shops) if shops else 0
        avg_rating = sum(s.get("rating", 0) for s in shops) / len(shops) if shops else 0
        total_reviews = sum(s.get("review_count", 0) for s in shops)

        dominant = max(style_index, key=style_index.get)
        dominant_cluster = 0
        for cid, clabel in self.cluster_labels.items():
            if dominant in clabel:
                dominant_cluster = cid
                break

        cluster_distribution = defaultdict(int)
        for shop in shops:
            cid = shop.get("cluster_id", 2)
            cluster_distribution[self.cluster_labels.get(cid, "未知")] += 1

        return {
            "district": district,
            "shop_count": len(shops),
            "style_index": style_index,
            "dominant_style": dominant,
            "dominant_cluster_id": dominant_cluster,
            "dominant_color": self.cluster_colors.get(dominant_cluster, "#999"),
            "avg_price": round(avg_price, 1),
            "avg_rating": round(avg_rating, 1),
            "total_reviews": total_reviews,
            "cluster_distribution": dict(cluster_distribution),
            "shops": shops,
            "radar_data": {
                "dimensions": dimensions,
                "values": [style_index[d] for d in dimensions],
            },
        }

    def _build_city_summary(self, city: str, shops: List[Dict], district_profiles: Dict) -> Dict:
        dimensions = list(self.dimension_map.keys())
        city_scores = {d: 0 for d in dimensions}

        for shop in shops:
            tags = shop.get("tags", [])
            for dim, keywords in self.dimension_map.items():
                for tag in tags:
                    if any(kw in tag for kw in keywords):
                        city_scores[dim] += 1

        total = sum(city_scores.values()) or 1
        city_style = {d: round(city_scores[d] / total * 100, 1) for d in dimensions}

        district_ranking = sorted(
            district_profiles.keys(),
            key=lambda d: district_profiles[d]["shop_count"],
            reverse=True,
        )

        return {
            "city": city,
            "total_shops": len(shops),
            "city_style": city_style,
            "district_ranking": district_ranking,
            "avg_price": round(sum(s.get("avg_price", 0) for s in shops) / len(shops), 1) if shops else 0,
            "avg_rating": round(sum(s.get("rating", 0) for s in shops) / len(shops), 1) if shops else 0,
            "radar_data": {
                "dimensions": dimensions,
                "values": [city_style[d] for d in dimensions],
            },
        }

    def get_all_profiles(self, shops: List[Dict]) -> Dict:
        cities = set(s.get("city", "") for s in shops)
        profiles = {}
        for city in cities:
            profiles[city] = self.profile_city(shops, city)
        return profiles
