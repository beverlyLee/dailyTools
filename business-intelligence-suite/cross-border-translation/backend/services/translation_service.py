import asyncio
from typing import Optional, Dict, List
from abc import ABC, abstractmethod
from config import settings
import json
import os

class BaseTranslationEngine(ABC):
    @abstractmethod
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        pass

class OpusMTEngine(BaseTranslationEngine):
    def __init__(self):
        self._models = {}
        self._initialized = False
    
    async def _ensure_model_loaded(self, source_lang: str, target_lang: str):
        model_key = f"{source_lang}-{target_lang}"
        
        if model_key not in self._models:
            try:
                from transformers import MarianMTModel, MarianTokenizer
                
                model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"
                tokenizer = MarianTokenizer.from_pretrained(model_name)
                model = MarianMTModel.from_pretrained(model_name)
                
                self._models[model_key] = (tokenizer, model)
            except Exception as e:
                print(f"Failed to load OPUS-MT model for {source_lang}-{target_lang}: {e}")
                raise
    
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        await self._ensure_model_loaded(source_lang, target_lang)
        
        model_key = f"{source_lang}-{target_lang}"
        tokenizer, model = self._models[model_key]
        
        inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        translated = model.generate(**inputs)
        result = tokenizer.batch_decode(translated, skip_special_tokens=True)[0]
        
        return result

class BusinessTermOptimizer:
    def __init__(self):
        self.business_terms = {
            "zh-en": {
                "公司": "company",
                "企业": "enterprise",
                "合作": "cooperation",
                "合同": "contract",
                "发票": "invoice",
                "付款": "payment",
                "交货": "delivery",
                "订单": "order",
                "报价": "quotation",
                "谈判": "negotiation",
                "市场": "market",
                "销售": "sales",
                "采购": "procurement",
                "供应链": "supply chain",
                "质量": "quality",
                "认证": "certification",
                "关税": "tariff",
                "报关": "customs declaration",
                "外汇": "foreign exchange",
                "信用证": "letter of credit"
            },
            "zh-ja": {
                "公司": "会社",
                "企业": "企業",
                "合作": "協力",
                "合同": "契約",
                "发票": "インボイス",
                "付款": "支払い",
                "交货": "納品",
                "订单": "注文",
                "报价": "見積もり",
                "谈判": "交渉",
                "市场": "市場",
                "销售": "販売",
                "采购": "調達",
                "供应链": "サプライチェーン",
                "质量": "品質",
                "认证": "認証",
                "关税": "関税",
                "报关": "通関",
                "外汇": "外貨",
                "信用证": "信用状"
            },
            "zh-ko": {
                "公司": "회사",
                "企业": "기업",
                "合作": "협력",
                "合同": "계약",
                "发票": "송장",
                "付款": "지불",
                "交货": "납품",
                "订单": "주문",
                "报价": "견적",
                "谈判": "교섭",
                "市场": "시장",
                "销售": "판매",
                "采购": "구매",
                "供应链": "공급망",
                "质量": "품질",
                "认证": "인증",
                "关税": "관세",
                "报关": "통관",
                "外汇": "외환",
                "信用证": "신용장"
            }
        }
    
    def optimize_translation(self, text: str, source_lang: str, target_lang: str) -> str:
        lang_pair = f"{source_lang}-{target_lang}"
        terms = self.business_terms.get(lang_pair, {})
        
        if not terms:
            return text
        
        for cn_term, foreign_term in terms.items():
            text = text.replace(cn_term, foreign_term)
        
        return text

class SimulatedTranslationEngine(BaseTranslationEngine):
    def __init__(self):
        self.optimizer = BusinessTermOptimizer()
        self.translation_samples = {
            "zh-en": {
                "您好": "Hello",
                "很高兴认识您": "Nice to meet you",
                "今天天气很好": "The weather is nice today",
                "我们来讨论一下商务合作": "Let's discuss business cooperation",
                "公司": "company",
                "合作": "cooperation",
                "合同": "contract",
                "发票": "invoice"
            },
            "zh-ja": {
                "您好": "こんにちは",
                "很高兴认识您": "お会いできて光栄です",
                "今天天气很好": "今日は天気がいいですね",
                "我们来讨论一下商务合作": "ビジネス協力について話し合いましょう",
                "公司": "会社",
                "合作": "協力",
                "合同": "契約",
                "发票": "インボイス"
            },
            "zh-ko": {
                "您好": "안녕하세요",
                "很高兴认识您": "만나서 반갑습니다",
                "今天天气很好": "오늘 날씨가 좋네요",
                "我们来讨论一下商务合作": "비즈니스 협력에 대해 이야기합시다",
                "公司": "회사",
                "合作": "협력",
                "合同": "계약",
                "发票": "송장"
            },
            "en-zh": {
                "Hello": "您好",
                "Nice to meet you": "很高兴认识您",
                "The weather is nice today": "今天天气很好",
                "Let's discuss business cooperation": "我们来讨论一下商务合作",
                "company": "公司",
                "cooperation": "合作",
                "contract": "合同",
                "invoice": "发票"
            }
        }
    
    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        lang_pair = f"{source_lang}-{target_lang}"
        samples = self.translation_samples.get(lang_pair, {})
        
        if text in samples:
            return samples[text]
        
        optimized = self.optimizer.optimize_translation(text, source_lang, target_lang)
        if optimized != text:
            return optimized
        
        fallback_translations = {
            "zh-en": f"[Translated] {text}",
            "zh-ja": f"[翻訳] {text}",
            "zh-ko": f"[번역] {text}",
            "en-zh": f"[已翻译] {text}"
        }
        return fallback_translations.get(lang_pair, f"[{lang_pair}] {text}")

class OfflinePhraseManager:
    def __init__(self, phrases_path: str):
        self.phrases_path = phrases_path
        self.phrases = {}
        self._load_phrases()
    
    def _load_phrases(self):
        if os.path.exists(self.phrases_path):
            with open(self.phrases_path, 'r', encoding='utf-8') as f:
                self.phrases = json.load(f)
        else:
            self._create_default_phrases()
            self._save_phrases()
    
    def _create_default_phrases(self):
        self.phrases = {
            "greetings": [
                {"id": 1, "category": "greetings", "source_language": "zh", "target_language": "en", 
                 "source_text": "您好，很高兴认识您", "translated_text": "Hello, nice to meet you", "is_favorite": True},
                {"id": 2, "category": "greetings", "source_language": "zh", "target_language": "ja", 
                 "source_text": "您好，很高兴认识您", "translated_text": "こんにちは、お会いできて光栄です", "is_favorite": True},
                {"id": 3, "category": "greetings", "source_language": "zh", "target_language": "ko", 
                 "source_text": "您好，很高兴认识您", "translated_text": "안녕하세요, 만나서 반갑습니다", "is_favorite": True}
            ],
            "business": [
                {"id": 4, "category": "business", "source_language": "zh", "target_language": "en", 
                 "source_text": "我们来讨论一下合作事宜", "translated_text": "Let's discuss the cooperation", "is_favorite": False},
                {"id": 5, "category": "business", "source_language": "zh", "target_language": "en", 
                 "source_text": "请查看我们的报价单", "translated_text": "Please review our quotation", "is_favorite": True},
                {"id": 6, "category": "business", "source_language": "zh", "target_language": "ja", 
                 "source_text": "契約書を確認してください", "translated_text": "请确认合同", "is_favorite": False}
            ],
            "trade": [
                {"id": 7, "category": "trade", "source_language": "zh", "target_language": "en", 
                 "source_text": "付款方式是信用证", "translated_text": "Payment method is letter of credit", "is_favorite": True},
                {"id": 8, "category": "trade", "source_language": "zh", "target_language": "en", 
                 "source_text": "交货期是下个月", "translated_text": "Delivery is next month", "is_favorite": False}
            ]
        }
    
    def _save_phrases(self):
        os.makedirs(os.path.dirname(self.phrases_path), exist_ok=True)
        with open(self.phrases_path, 'w', encoding='utf-8') as f:
            json.dump(self.phrases, f, ensure_ascii=False, indent=2)
    
    def get_phrases_by_category(self, category: str, source_lang: str, target_lang: str) -> List[Dict]:
        phrases = self.phrases.get(category, [])
        return [p for p in phrases if p["source_language"] == source_lang and p["target_language"] == target_lang]
    
    def get_all_phrases(self) -> List[Dict]:
        all_phrases = []
        for category_phrases in self.phrases.values():
            all_phrases.extend(category_phrases)
        return all_phrases
    
    def get_favorite_phrases(self, source_lang: str, target_lang: str) -> List[Dict]:
        favorites = []
        for category_phrases in self.phrases.values():
            for phrase in category_phrases:
                if (phrase.get("is_favorite", False) and 
                    phrase["source_language"] == source_lang and 
                    phrase["target_language"] == target_lang):
                    favorites.append(phrase)
        return favorites
    
    def find_match(self, text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
        for category_phrases in self.phrases.values():
            for phrase in category_phrases:
                if (phrase["source_text"] == text and 
                    phrase["source_language"] == source_lang and 
                    phrase["target_language"] == target_lang):
                    return phrase
        return None

def get_translation_engine() -> BaseTranslationEngine:
    engine_name = settings.TRANSLATION_ENGINE.lower()
    
    if engine_name == "opus":
        try:
            return OpusMTEngine()
        except Exception as e:
            print(f"Failed to initialize OPUS-MT, using simulated translation: {e}")
            return SimulatedTranslationEngine()
    else:
        return SimulatedTranslationEngine()

translation_engine = get_translation_engine()
offline_phrases_manager = OfflinePhraseManager(settings.OFFLINE_PHRASES_PATH)
business_optimizer = BusinessTermOptimizer()
