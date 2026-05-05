from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class BERTCheckResult:
    category: str
    original_text: str
    suggested_text: Optional[str]
    position_start: int
    position_end: int
    explanation: str
    confidence: float


class BaseBERTService(ABC):
    
    @abstractmethod
    def check_political_terms(self, text: str) -> List[BERTCheckResult]:
        pass
    
    @abstractmethod
    def check_grammar(self, text: str) -> List[BERTCheckResult]:
        pass
    
    @abstractmethod
    def suggest_polishing(self, text: str) -> List[BERTCheckResult]:
        pass


class MockBERTService(BaseBERTService):
    
    def __init__(self):
        self.political_terms_rules = {
            "习近平": {
                "suggested": "习近平总书记",
                "explanation": "在正式公文中，提及最高领导人时应使用完整规范的称谓",
                "confidence": 0.95
            },
            "习总书记": {
                "suggested": "习近平总书记",
                "explanation": "在正式公文中，应使用完整规范的称谓「习近平总书记」",
                "confidence": 0.90
            },
            "党中央": {
                "suggested": None,
                "explanation": "「党中央」可以使用，但在正式文件中建议使用「中共中央」",
                "confidence": 0.70
            },
        }
        
        self.common_collocations = {
            "提升水平": {
                "suggested": "提高水平",
                "explanation": "公文常用搭配：「提高水平」",
                "confidence": 0.85
            },
            "增强建设": {
                "suggested": "加强建设",
                "explanation": "公文常用搭配：「加强建设」",
                "confidence": 0.85
            },
            "提高意识": {
                "suggested": "增强意识",
                "explanation": "公文常用搭配：「增强意识」",
                "confidence": 0.85
            },
        }
        
        self.colloquial_to_formal = {
            "很多": {
                "suggested": "诸多",
                "explanation": "正式公文建议使用书面语表达",
                "confidence": 0.70
            },
            "很好": {
                "suggested": "良好",
                "explanation": "正式公文建议使用书面语表达",
                "confidence": 0.70
            },
            "非常重要": {
                "suggested": "极其重要",
                "explanation": "正式公文建议使用书面语表达",
                "confidence": 0.65
            },
            "搞": {
                "suggested": "做",
                "explanation": "正式公文避免使用口语化的「搞」",
                "confidence": 0.80
            },
            "赶紧": {
                "suggested": "抓紧",
                "explanation": "正式公文建议使用书面语表达",
                "confidence": 0.80
            },
            "马上": {
                "suggested": "立即",
                "explanation": "正式公文建议使用书面语表达",
                "confidence": 0.80
            },
        }
    
    def check_political_terms(self, text: str) -> List[BERTCheckResult]:
        results = []
        
        for term, rule in self.political_terms_rules.items():
            start_idx = 0
            while True:
                idx = text.find(term, start_idx)
                if idx == -1:
                    break
                
                results.append(BERTCheckResult(
                    category="政治术语",
                    original_text=term,
                    suggested_text=rule["suggested"],
                    position_start=idx,
                    position_end=idx + len(term),
                    explanation=rule["explanation"],
                    confidence=rule["confidence"]
                ))
                
                start_idx = idx + len(term)
        
        return results
    
    def check_grammar(self, text: str) -> List[BERTCheckResult]:
        results = []
        
        for phrase, rule in self.common_collocations.items():
            start_idx = 0
            while True:
                idx = text.find(phrase, start_idx)
                if idx == -1:
                    break
                
                results.append(BERTCheckResult(
                    category="固定搭配",
                    original_text=phrase,
                    suggested_text=rule["suggested"],
                    position_start=idx,
                    position_end=idx + len(phrase),
                    explanation=rule["explanation"],
                    confidence=rule["confidence"]
                ))
                
                start_idx = idx + len(phrase)
        
        return results
    
    def suggest_polishing(self, text: str) -> List[BERTCheckResult]:
        results = []
        
        for phrase, rule in self.colloquial_to_formal.items():
            start_idx = 0
            while True:
                idx = text.find(phrase, start_idx)
                if idx == -1:
                    break
                
                results.append(BERTCheckResult(
                    category="润色建议",
                    original_text=phrase,
                    suggested_text=rule["suggested"],
                    position_start=idx,
                    position_end=idx + len(phrase),
                    explanation=rule["explanation"],
                    confidence=rule["confidence"]
                ))
                
                start_idx = idx + len(phrase)
        
        return results


class RealBERTService(BaseBERTService):
    
    def __init__(self, model_path: str = "hfl/chinese-roberta-wwm-ext"):
        try:
            from transformers import (
                BertTokenizer,
                BertForMaskedLM,
                pipeline,
                TextClassificationPipeline
            )
            import torch
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.tokenizer = BertTokenizer.from_pretrained(model_path)
            self.model = BertForMaskedLM.from_pretrained(model_path)
            self.model.to(self.device)
            self.fill_mask = pipeline(
                "fill-mask",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            self._initialized = True
        except Exception as e:
            print(f"BERT模型加载失败: {e}")
            print("将使用模拟模式运行...")
            self._initialized = False
    
    def check_political_terms(self, text: str) -> List[BERTCheckResult]:
        if not self._initialized:
            return []
        
        results = []
        return results
    
    def check_grammar(self, text: str) -> List[BERTCheckResult]:
        if not self._initialized:
            return []
        
        results = []
        return results
    
    def suggest_polishing(self, text: str) -> List[BERTCheckResult]:
        if not self._initialized:
            return []
        
        results = []
        return results


def get_bert_service(use_real_bert: bool = False, model_path: str = "hfl/chinese-roberta-wwm-ext") -> BaseBERTService:
    if use_real_bert:
        service = RealBERTService(model_path)
        if service._initialized:
            return service
    
    return MockBERTService()


def bert_result_to_dict(result: BERTCheckResult) -> Dict[str, Any]:
    return {
        "category": result.category,
        "original_text": result.original_text,
        "suggested_text": result.suggested_text,
        "position_start": result.position_start,
        "position_end": result.position_end,
        "explanation": result.explanation,
        "confidence": result.confidence
    }
