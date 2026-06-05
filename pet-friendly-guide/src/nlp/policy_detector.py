import re
import jieba
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum


class PetPolicy(Enum):
    FRIENDLY = "friendly"
    OUTDOOR_ONLY = "outdoor_only"
    FORBIDDEN = "forbidden"
    UNKNOWN = "unknown"


@dataclass
class PetFacility:
    has_water_bowl: bool = False
    has_pee_pad: bool = False
    has_pet_snack: bool = False
    has_pet_cart: bool = False
    has_pet_area: bool = False


@dataclass
class PetAnalysisResult:
    policy: PetPolicy
    facility: PetFacility
    confidence: float
    evidence: List[str]
    shop_name: str = ""


class PolicyDetector:
    def __init__(self):
        self._init_keywords()
        jieba.initialize()

    def _init_keywords(self):
        self.friendly_keywords = [
            "可以带", "允许带", "宠物友好", "欢迎宠物", "可以进", "允许进",
            "不排斥", "接受宠物", "欢迎狗狗", "欢迎猫咪", "带宠物", "带狗狗", "带猫"
        ]
        
        self.forbidden_keywords = [
            "禁止", "不允许", "不让进", "不能带", "不准带", "谢绝宠物",
            "禁止入内", "不可以带", "勿带", "禁带"
        ]
        
        self.outdoor_keywords = [
            "户外", "露台", "室外", "露天", "户外区", "露台区", "室外区",
            "户外可以", "露台可以", "室外可以", "仅限户外", "仅限室外", "只限露台"
        ]
        
        self.facility_keywords = {
            "has_water_bowl": ["水碗", "水盆", "饮水", "喝水"],
            "has_pee_pad": ["尿垫", "尿不湿", "厕所", "便便"],
            "has_pet_snack": ["零食", "小零食", " treats"],
            "has_pet_cart": ["推车", "宠物车", "租赁"],
            "has_pet_area": ["宠物区", "狗狗区", "猫咪区", "专门区域"]
        }

    def _tokenize(self, text: str) -> List[str]:
        return list(jieba.cut(text))

    def _count_keyword_matches(self, text: str, keywords: List[str]) -> int:
        count = 0
        text_lower = text.lower()
        for kw in keywords:
            if kw in text_lower:
                count += 1
        return count

    def _check_facilities(self, text: str) -> PetFacility:
        facility = PetFacility()
        text_lower = text.lower()
        
        for attr, keywords in self.facility_keywords.items():
            for kw in keywords:
                if kw in text_lower:
                    setattr(facility, attr, True)
                    break
        
        return facility

    def _collect_evidence(self, text: str, keywords: List[str]) -> List[str]:
        evidence = []
        sentences = re.split(r'[。！？；.!?;]', text)
        for sentence in sentences:
            for kw in keywords:
                if kw in sentence:
                    evidence.append(sentence.strip())
                    break
        return [e for e in evidence if e]

    def analyze_review(self, review: Dict) -> PetAnalysisResult:
        text = review.get("content", "")
        shop_name = review.get("shop_name", "")
        
        friendly_count = self._count_keyword_matches(text, self.friendly_keywords)
        forbidden_count = self._count_keyword_matches(text, self.forbidden_keywords)
        outdoor_count = self._count_keyword_matches(text, self.outdoor_keywords)
        
        all_keywords = (self.friendly_keywords + self.forbidden_keywords + 
                       self.outdoor_keywords + [k for ks in self.facility_keywords.values() for k in ks])
        evidence = self._collect_evidence(text, all_keywords)
        
        facility = self._check_facilities(text)
        
        total_matches = friendly_count + forbidden_count + outdoor_count
        confidence = min(1.0, total_matches * 0.2 + 0.3) if total_matches > 0 else 0.3
        
        if forbidden_count > 0 and forbidden_count >= friendly_count:
            policy = PetPolicy.FORBIDDEN
        elif outdoor_count > 0 and friendly_count == 0:
            policy = PetPolicy.OUTDOOR_ONLY
        elif friendly_count > 0:
            policy = PetPolicy.FRIENDLY
        else:
            policy = PetPolicy.UNKNOWN
        
        return PetAnalysisResult(
            policy=policy,
            facility=facility,
            confidence=confidence,
            evidence=evidence,
            shop_name=shop_name
        )

    def aggregate_analysis(self, reviews: List[Dict]) -> Dict[str, PetAnalysisResult]:
        shop_results = {}
        
        for review in reviews:
            shop_name = review.get("shop_name", "未知商户")
            result = self.analyze_review(review)
            
            if shop_name not in shop_results:
                shop_results[shop_name] = {
                    "results": [],
                    "evidence": []
                }
            
            shop_results[shop_name]["results"].append(result)
            shop_results[shop_name]["evidence"].extend(result.evidence)
        
        final_results = {}
        for shop_name, data in shop_results.items():
            results = data["results"]
            evidence = list(set(data["evidence"]))
            
            policy_votes = {p: 0 for p in PetPolicy}
            combined_facility = PetFacility()
            total_confidence = 0.0
            
            for r in results:
                policy_votes[r.policy] += r.confidence
                total_confidence += r.confidence
                
                for attr in self.facility_keywords.keys():
                    if getattr(r.facility, attr):
                        setattr(combined_facility, attr, True)
            
            best_policy = max(policy_votes, key=policy_votes.get)
            avg_confidence = total_confidence / len(results) if results else 0.0
            
            final_results[shop_name] = PetAnalysisResult(
                policy=best_policy,
                facility=combined_facility,
                confidence=avg_confidence,
                evidence=evidence,
                shop_name=shop_name
            )
        
        return final_results

    def result_to_dict(self, result: PetAnalysisResult) -> Dict:
        return {
            "shop_name": result.shop_name,
            "policy": result.policy.value,
            "policy_text": self._policy_to_text(result.policy),
            "confidence": round(result.confidence, 2),
            "facility": {
                "has_water_bowl": result.facility.has_water_bowl,
                "has_pee_pad": result.facility.has_pee_pad,
                "has_pet_snack": result.facility.has_pet_snack,
                "has_pet_cart": result.facility.has_pet_cart,
                "has_pet_area": result.facility.has_pet_area
            },
            "evidence": result.evidence
        }

    def _policy_to_text(self, policy: PetPolicy) -> str:
        mapping = {
            PetPolicy.FRIENDLY: "允许宠物进入",
            PetPolicy.OUTDOOR_ONLY: "仅限户外区",
            PetPolicy.FORBIDDEN: "禁止宠物进入",
            PetPolicy.UNKNOWN: "政策未知"
        }
        return mapping.get(policy, "未知")


if __name__ == "__main__":
    detector = PolicyDetector()
    
    test_reviews = [
        {
            "content": "这家咖啡馆真的太棒了！可以带狗狗进去，店员还给准备了宠物专用水碗，太贴心了！",
            "shop_name": "Paw Coffee 爪爪咖啡馆",
            "source": "dianping"
        },
        {
            "content": "这家餐厅明确禁止宠物入内，只能放在门口的笼子里。",
            "shop_name": "传统美食餐厅",
            "source": "xiaohongshu"
        }
    ]
    
    results = detector.aggregate_analysis(test_reviews)
    for shop_name, result in results.items():
        print(f"\n{shop_name}:")
        print(detector.result_to_dict(result))
