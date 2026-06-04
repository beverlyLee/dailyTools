import os
import json
import jieba
from collections import Counter
from typing import List, Dict, Tuple
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


class TagClusterer:
    def __init__(self, n_clusters: int = 5):
        self.n_clusters = n_clusters
        self.vectorizer = TfidfVectorizer(max_features=100)
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        self.tag_vocabulary = {}
        self.cluster_labels = {
            0: "硬核推理区",
            1: "恐怖惊悚区",
            2: "欢乐机制区",
            3: "情感沉浸区",
            4: "阵营对抗区",
        }
        self.cluster_keywords = {
            0: ["硬核推理", "本格推理", "变格推理", "推理", "沉浸剧场", "密室逃脱", "解谜"],
            1: ["恐怖惊悚", "恐怖", "惊悚", "鬼屋", "暗黑", "NPC互动", "沉浸式"],
            2: ["欢乐机制", "欢乐", "机制", "派对游戏", "轻松休闲", "轻松", "搞笑"],
            3: ["情感沉浸", "情感", "沉浸", "古风本", "沉浸剧场", "情感本", "治愈"],
            4: ["阵营对抗", "阵营", "对抗", "机制本", "竞技", "策略"],
        }

    def fit(self, shops: List[Dict]) -> Dict:
        tags_list = []
        for shop in shops:
            tags = shop.get("tags", [])
            tags_text = " ".join(tags)
            district = shop.get("district", "")
            name = shop.get("name", "")
            full_text = f"{name} {' '.join(tags)} {district}"
            tags_list.append(full_text)

        if not tags_list:
            return {"clusters": [], "tag_stats": {}}

        tfidf_matrix = self.vectorizer.fit_transform(tags_list)
        self.kmeans.fit(tfidf_matrix)

        cluster_results = {}
        for i in range(self.n_clusters):
            cluster_mask = self.kmeans.labels_ == i
            cluster_shops = [shops[j] for j in range(len(shops)) if cluster_mask[j]]
            label = self.cluster_labels.get(i, f"聚类{i}")
            cluster_results[label] = {
                "cluster_id": i,
                "shops": cluster_shops,
                "count": len(cluster_shops),
            }

        tag_stats = self._compute_tag_stats(shops)

        return {
            "clusters": cluster_results,
            "tag_stats": tag_stats,
            "labels": self.kmeans.labels_.tolist(),
        }

    def _compute_tag_stats(self, shops: List[Dict]) -> Dict:
        tag_counter = Counter()
        for shop in shops:
            for tag in shop.get("tags", []):
                tag_counter[tag] += 1
        return dict(tag_counter.most_common(50))

    def assign_cluster(self, tags: List[str]) -> Tuple[int, str]:
        if not tags:
            return 2, "欢乐机制区"

        tag_scores = {}
        for cluster_id, keywords in self.cluster_keywords.items():
            score = sum(1 for t in tags if any(kw in t for kw in keywords))
            tag_scores[cluster_id] = score

        best_cluster = max(tag_scores, key=tag_scores.get) if tag_scores else 2
        return best_cluster, self.cluster_labels.get(best_cluster, "未知")

    def get_radar_data(self, shops: List[Dict]) -> Dict:
        dimension_map = {
            "硬核推理": ["硬核推理", "本格推理", "变格推理", "推理", "解谜"],
            "恐怖惊悚": ["恐怖惊悚", "恐怖", "惊悚", "鬼屋", "暗黑"],
            "欢乐机制": ["欢乐机制", "欢乐", "机制", "派对游戏", "轻松休闲"],
            "情感沉浸": ["情感沉浸", "情感", "沉浸", "古风本", "治愈"],
            "阵营对抗": ["阵营对抗", "阵营", "对抗", "机制本", "竞技"],
        }

        dimensions = list(dimension_map.keys())
        scores = {d: 0 for d in dimensions}

        for shop in shops:
            tags = shop.get("tags", [])
            for dim, keywords in dimension_map.items():
                for tag in tags:
                    if any(kw in tag for kw in keywords):
                        scores[dim] += 1

        total = sum(scores.values()) or 1
        values = [round(scores[d] / total * 100, 1) for d in dimensions]

        return {
            "dimensions": dimensions,
            "values": values,
            "raw_scores": scores,
            "total_shops": len(shops),
        }
