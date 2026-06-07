from typing import List, Dict, Tuple
from dataclasses import dataclass, field

from src.model.solitude_index import SolitudeIndexResult


BOOKSTORE_TYPES = [
    "deep_reading",
    "family_friendly",
    "internet_famous",
    "study_oriented"
]

TYPE_NAMES_CN = {
    "deep_reading": "深度阅读型",
    "family_friendly": "亲子型",
    "internet_famous": "网红打卡型",
    "study_oriented": "教辅型"
}

TYPE_COLORS = {
    "deep_reading": "#1a365d",
    "family_friendly": "#2f855a",
    "internet_famous": "#d69e2e",
    "study_oriented": "#742a2a"
}


@dataclass
class BookstoreClassification:
    bookstore_id: str
    bookstore_name: str
    primary_type: str
    type_scores: Dict[str, float] = field(default_factory=dict)
    type_vector: List[float] = field(default_factory=list)
    confidence: float = 0.0


class BookstoreClassifier:
    def __init__(self):
        self.type_weights = {
            "deep_reading": {"solitude": 0.75, "student": 0.1, "family": 0.05, "internet_famous": 0.1},
            "family_friendly": {"family": 0.7, "internet_famous": 0.15, "solitude": 0.05, "student": 0.1},
            "internet_famous": {"internet_famous": 0.7, "family": 0.15, "solitude": 0.05, "student": 0.1},
            "study_oriented": {"student": 0.75, "solitude": 0.1, "family": 0.1, "internet_famous": 0.05}
        }

    def _normalize_scores(self, solitude_score: float, family_score: float,
                          student_score: float, internet_famous_score: float) -> Dict[str, float]:
        total = solitude_score + family_score + student_score + internet_famous_score
        if total == 0:
            return {
                "solitude": 0.25,
                "family": 0.25,
                "student": 0.25,
                "internet_famous": 0.25
            }
        return {
            "solitude": solitude_score / total,
            "family": family_score / total,
            "student": student_score / total,
            "internet_famous": internet_famous_score / total
        }

    def classify(self, solitude_result: SolitudeIndexResult) -> BookstoreClassification:
        normalized = self._normalize_scores(
            solitude_result.solitude_score,
            solitude_result.family_score,
            solitude_result.student_score,
            solitude_result.internet_famous_score
        )

        type_scores = {}
        for btype, weights in self.type_weights.items():
            score = sum(normalized[dim] * weight for dim, weight in weights.items())
            type_scores[btype] = score

        sorted_types = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
        primary_type = sorted_types[0][0]
        top_score = sorted_types[0][1]
        second_score = sorted_types[1][1] if len(sorted_types) > 1 else 0

        confidence = top_score - second_score

        type_vector = [type_scores[t] for t in BOOKSTORE_TYPES]

        result = BookstoreClassification(
            bookstore_id=solitude_result.bookstore_id,
            bookstore_name=solitude_result.bookstore_name,
            primary_type=primary_type,
            type_scores={k: round(v, 4) for k, v in type_scores.items()},
            type_vector=[round(v, 4) for v in type_vector],
            confidence=round(confidence, 4)
        )

        return result

    def classify_batch(self, solitude_results: List[SolitudeIndexResult]) -> List[BookstoreClassification]:
        return [self.classify(r) for r in solitude_results]

    def calculate_similarity(self, class_a: BookstoreClassification,
                              class_b: BookstoreClassification) -> float:
        vector_a = class_a.type_vector
        vector_b = class_b.type_vector

        dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
        mag_a = sum(a * a for a in vector_a) ** 0.5
        mag_b = sum(b * b for b in vector_b) ** 0.5

        if mag_a == 0 or mag_b == 0:
            return 0.0

        cosine_similarity = dot_product / (mag_a * mag_b)
        return round(cosine_similarity, 4)

    def build_similarity_network(self, classifications: List[BookstoreClassification],
                                  similarity_threshold: float = 0.5) -> List[Dict]:
        edges = []
        n = len(classifications)

        for i in range(n):
            for j in range(i + 1, n):
                sim = self.calculate_similarity(classifications[i], classifications[j])
                if sim >= similarity_threshold:
                    edges.append({
                        "source": classifications[i].bookstore_id,
                        "target": classifications[j].bookstore_id,
                        "value": round(sim, 4),
                        "same_type": classifications[i].primary_type == classifications[j].primary_type
                    })

        return edges

    def get_type_statistics(self, classifications: List[BookstoreClassification]) -> Dict:
        type_counts = {}
        for c in classifications:
            t = c.primary_type
            type_counts[t] = type_counts.get(t, 0) + 1

        total = len(classifications)
        type_percentages = {
            t: {"count": c, "percentage": round(c / total * 100, 1) if total > 0 else 0}
            for t, c in type_counts.items()
        }

        return {
            "total": total,
            "by_type": type_percentages
        }
