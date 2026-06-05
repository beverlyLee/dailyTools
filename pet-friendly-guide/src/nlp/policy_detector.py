import re
import jieba
from typing import List, Dict, Tuple
from dataclasses import dataclass
from enum import Enum


class LocationRestriction(Enum):
    INDOOR = "indoor"
    OUTDOOR = "outdoor"
    BOTH = "both"
    UNKNOWN = "unknown"


@dataclass
class PetFacility:
    has_water_bowl: bool = False
    has_pee_pad: bool = False
    has_pet_snack: bool = False
    has_pet_cart: bool = False
    has_pet_area: bool = False


@dataclass
class PetService:
    has_pet_sitting: bool = False
    has_pet_grooming: bool = False
    has_pet_toys: bool = False


@dataclass
class PetAnalysisResult:
    is_pet_friendly: bool
    location_restriction: LocationRestriction
    facility: PetFacility
    service: PetService
    attitude: str
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
            "不排斥", "接受宠物", "欢迎狗狗", "欢迎猫咪", "带宠物", "带狗狗", "带猫",
            "没问题", "赞", "贴心", "好评", "推荐", "太棒了", "超棒"
        ]
        
        self.forbidden_keywords = [
            "禁止", "不允许", "不让进", "不能带", "不准带", "谢绝宠物",
            "禁止入内", "不可以带", "勿带", "禁带", "不行", "不友好", "差评"
        ]
        
        self.indoor_allow_keywords = [
            "室内可以", "室内允许", "室内也可以", "室内没问题",
            "店内可以", "店里可以"
        ]
        
        self.both_allow_keywords = [
            "全场", "全馆", "整个店", "整家店", "室内外都可以", "室内外都允许",
            "室内外都能带", "室内外都可以带"
        ]
        
        self.outdoor_restrict_keywords = [
            "仅限户外", "仅限室外", "只限露台", "只能在户外", "只能在露台", "只能在室外",
            "只允许户外", "只允许露台", "只允许室外", "但是室内不行", "但室内不行",
            "室内不可以", "室内不让", "室内不能带", "室内禁止", "室内不行"
        ]
        
        self.outdoor_allow_keywords = [
            "户外", "露台", "室外", "露天", "户外区", "露台区", "室外区",
            "户外可以", "露台可以", "室外可以", "露台允许", "花园"
        ]
        
        self.attitude_keywords = {
            "excellent": ["热情", "超赞", "贴心", "主动", "耐心", "友好", "亲切"],
            "good": ["不错", "可以", "还好", "一般", "普通"],
            "poor": ["冷漠", "不耐烦", "不好", "差", "恶劣"]
        }
        
        self.facility_keywords = {
            "has_water_bowl": ["水碗", "水盆", "饮水", "喝水", "提供水"],
            "has_pee_pad": ["尿垫", "尿不湿", "厕所", "便便", "垃圾袋", "拾便袋"],
            "has_pet_snack": ["零食", "小零食", "小零食", " treats", "给了零食", "提供零食"],
            "has_pet_cart": ["推车", "宠物车", "租赁", "借推车"],
            "has_pet_area": ["宠物区", "狗狗区", "猫咪区", "专门区域", "收拾了一块区域",
                            "玩耍区域", "活动区", "专门的地方", "猫咪玩耍"]
        }
        
        self.service_keywords = {
            "has_pet_sitting": ["寄养", "托管", "照看", "看顾"],
            "has_pet_grooming": ["美容", "洗澡", "造型", "修毛"],
            "has_pet_toys": ["玩具", "逗猫棒", "球"]
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

    def _check_services(self, text: str) -> PetService:
        service = PetService()
        text_lower = text.lower()
        
        for attr, keywords in self.service_keywords.items():
            for kw in keywords:
                if kw in text_lower:
                    setattr(service, attr, True)
                    break
        
        return service

    def _check_attitude(self, text: str) -> str:
        text_lower = text.lower()
        for attitude, keywords in self.attitude_keywords.items():
            for kw in keywords:
                if kw in text_lower:
                    return attitude
        return "unknown"

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
        indoor_allow_count = self._count_keyword_matches(text, self.indoor_allow_keywords)
        outdoor_allow_count = self._count_keyword_matches(text, self.outdoor_allow_keywords)
        outdoor_restrict_count = self._count_keyword_matches(text, self.outdoor_restrict_keywords)
        both_allow_count = self._count_keyword_matches(text, self.both_allow_keywords)
        
        all_keywords = (
            self.friendly_keywords + self.forbidden_keywords + 
            self.indoor_allow_keywords + self.outdoor_allow_keywords +
            self.outdoor_restrict_keywords + self.both_allow_keywords +
            [k for ks in self.facility_keywords.values() for k in ks] +
            [k for ks in self.service_keywords.values() for k in ks]
        )
        evidence = self._collect_evidence(text, all_keywords)
        
        facility = self._check_facilities(text)
        service = self._check_services(text)
        attitude = self._check_attitude(text)
        
        total_matches = friendly_count + forbidden_count + indoor_allow_count + outdoor_allow_count + outdoor_restrict_count + both_allow_count
        confidence = min(1.0, total_matches * 0.2 + 0.3) if total_matches > 0 else 0.3
        
        has_facility_or_service = (facility.has_water_bowl or facility.has_pee_pad or 
                               facility.has_pet_snack or facility.has_pet_area or
                               service.has_pet_sitting or service.has_pet_grooming or service.has_pet_toys)
        
        is_any_allow = (friendly_count > 0 or indoor_allow_count > 0 or 
                       outdoor_allow_count > 0 or outdoor_restrict_count > 0 or
                       both_allow_count > 0 or has_facility_or_service)
        
        is_strictly_forbidden = self._is_strictly_forbidden(text)
        
        if is_strictly_forbidden:
            is_pet_friendly = False
        elif is_any_allow:
            is_pet_friendly = True
        elif forbidden_count > 0:
            is_pet_friendly = False
        else:
            is_pet_friendly = None
        
        if is_pet_friendly:
            if outdoor_restrict_count > 0:
                location_restriction = LocationRestriction.OUTDOOR
            elif both_allow_count > 0:
                location_restriction = LocationRestriction.BOTH
            elif indoor_allow_count > 0 and outdoor_allow_count > 0:
                location_restriction = LocationRestriction.BOTH
            elif indoor_allow_count > 0:
                location_restriction = LocationRestriction.INDOOR
            elif outdoor_allow_count > 0:
                location_restriction = LocationRestriction.OUTDOOR
            else:
                location_restriction = LocationRestriction.BOTH
        else:
            location_restriction = LocationRestriction.UNKNOWN
        
        return PetAnalysisResult(
            is_pet_friendly=is_pet_friendly,
            location_restriction=location_restriction,
            facility=facility,
            service=service,
            attitude=attitude,
            confidence=confidence,
            evidence=evidence,
            shop_name=shop_name
        )

    def _is_strictly_forbidden(self, text: str) -> bool:
        strictly_forbidden_patterns = [
            "完全禁止", "全程不允许", "禁止入内", "谢绝入内",
            "不可以带", "不能带", "不让带", "不准带", "禁带",
            "不允许带宠物", "禁止带宠物", "谢绝宠物",
            "宠物禁止入内", "宠物不能进", "宠物不让进",
            "不允许带", "不让带宠物", "不准带宠物",
            "说不允许带", "说不让带", "说不能带"
        ]
        
        positive_allow_patterns = [
            "但是可以带", "不过可以带", "但是允许带", "不过允许带",
            "但是可以进", "不过可以进", "但可以带", "但允许带"
        ]
        
        for pattern in strictly_forbidden_patterns:
            if pattern in text:
                pat_idx = text.find(pattern)
                for allow_kw in positive_allow_patterns:
                    allow_idx = text.find(allow_kw)
                    if allow_idx != -1 and abs(allow_idx - pat_idx) < 30:
                        return False
                return True
        
        return False

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
            
            friendly_votes = sum(1 for r in results if r.is_pet_friendly is True)
            forbidden_votes = sum(1 for r in results if r.is_pet_friendly is False)
            unknown_votes = sum(1 for r in results if r.is_pet_friendly is None)
            
            if friendly_votes > forbidden_votes:
                is_pet_friendly = True
            elif forbidden_votes > friendly_votes:
                is_pet_friendly = False
            else:
                is_pet_friendly = None if unknown_votes > 0 else (friendly_votes > 0)
            
            location_votes = {lr: 0 for lr in LocationRestriction}
            combined_facility = PetFacility()
            combined_service = PetService()
            attitude_counts = {"excellent": 0, "good": 0, "poor": 0, "unknown": 0}
            total_confidence = 0.0
            
            for r in results:
                if r.is_pet_friendly:
                    location_votes[r.location_restriction] += r.confidence
                total_confidence += r.confidence
                
                for attr in self.facility_keywords.keys():
                    if getattr(r.facility, attr):
                        setattr(combined_facility, attr, True)
                
                for attr in self.service_keywords.keys():
                    if getattr(r.service, attr):
                        setattr(combined_service, attr, True)
                
                if r.attitude in attitude_counts:
                    attitude_counts[r.attitude] += 1
            
            if is_pet_friendly:
                best_location = max(location_votes, key=location_votes.get)
            else:
                best_location = LocationRestriction.UNKNOWN
            
            avg_confidence = total_confidence / len(results) if results else 0.0
            best_attitude = max(attitude_counts, key=attitude_counts.get) if attitude_counts else "unknown"
            
            final_results[shop_name] = PetAnalysisResult(
                is_pet_friendly=is_pet_friendly,
                location_restriction=best_location,
                facility=combined_facility,
                service=combined_service,
                attitude=best_attitude,
                confidence=avg_confidence,
                evidence=evidence,
                shop_name=shop_name
            )
        
        return final_results

    def result_to_dict(self, result: PetAnalysisResult) -> Dict:
        return {
            "shop_name": result.shop_name,
            "is_pet_friendly": result.is_pet_friendly,
            "location_restriction": result.location_restriction.value,
            "location_text": self._location_to_text(result.location_restriction),
            "attitude": result.attitude,
            "attitude_text": self._attitude_to_text(result.attitude),
            "confidence": round(result.confidence, 2),
            "facility": {
                "has_water_bowl": result.facility.has_water_bowl,
                "has_pee_pad": result.facility.has_pee_pad,
                "has_pet_snack": result.facility.has_pet_snack,
                "has_pet_cart": result.facility.has_pet_cart,
                "has_pet_area": result.facility.has_pet_area
            },
            "service": {
                "has_pet_sitting": result.service.has_pet_sitting,
                "has_pet_grooming": result.service.has_pet_grooming,
                "has_pet_toys": result.service.has_pet_toys
            },
            "evidence": result.evidence
        }

    def _location_to_text(self, location: LocationRestriction) -> str:
        mapping = {
            LocationRestriction.INDOOR: "室内允许",
            LocationRestriction.OUTDOOR: "仅限户外",
            LocationRestriction.BOTH: "室内外均可",
            LocationRestriction.UNKNOWN: "位置限制未知"
        }
        return mapping.get(location, "未知")

    def _attitude_to_text(self, attitude: str) -> str:
        mapping = {
            "excellent": "店员态度非常好",
            "good": "店员态度不错",
            "poor": "店员态度较差",
            "unknown": "店员态度未知"
        }
        return mapping.get(attitude, "未知")

    def get_policy_display(self, result: PetAnalysisResult) -> str:
        if not result.is_pet_friendly:
            return "forbidden"
        if result.location_restriction == LocationRestriction.OUTDOOR:
            return "outdoor_only"
        return "friendly"


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
        },
        {
            "content": "室外露台允许带狗狗，但是室内不行，天气好的时候来坐坐还不错。",
            "shop_name": "露台花园餐厅",
            "source": "xiaohongshu"
        }
    ]
    
    results = detector.aggregate_analysis(test_reviews)
    for shop_name, result in results.items():
        print(f"\n{shop_name}:")
        print(detector.result_to_dict(result))
