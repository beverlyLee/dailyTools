import os
import re
from typing import Dict, Any, Optional
from app.config import settings

try:
    from transformers import MarianMTModel, MarianTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Transformers not installed. Translation will use mock implementation.")

class TranslationService:
    def __init__(self):
        self.models = {}
        self.tokenizers = {}
        self.model_cache_dir = settings.TRANSLATION_MODEL_CACHE_DIR
        self._business_terms = self._load_business_terms()
    
    def _load_business_terms(self) -> Dict[str, Dict[str, str]]:
        return {
            "zh-en": {
                "FOB": "FOB (Free On Board)",
                "CIF": "CIF (Cost, Insurance and Freight)",
                "CFR": "CFR (Cost and Freight)",
                "EXW": "EXW (Ex Works)",
                "DDP": "DDP (Delivered Duty Paid)",
                "L/C": "Letter of Credit",
                "信用证": "Letter of Credit",
                "提单": "Bill of Lading",
                "原产地证": "Certificate of Origin",
                "商检证": "Inspection Certificate",
                "装箱单": "Packing List",
                "商业发票": "Commercial Invoice",
                "报关单": "Customs Declaration",
                "关税": "Customs Duty",
                "增值税": "Value Added Tax (VAT)",
                "退税率": "Tax Rebate Rate",
                "外汇": "Foreign Exchange",
                "汇率": "Exchange Rate",
                "报价": "Quotation",
                "还盘": "Counter Offer",
                "还盘价": "Counter Offer Price",
                "议价": "Price Negotiation",
                "最低价": "Rock-bottom Price",
                "最高价": "Ceiling Price",
                "佣金": "Commission",
                "折扣": "Discount",
                "样品": "Sample",
                "订单": "Order",
                "形式发票": "Proforma Invoice",
                "合同": "Contract",
                "协议": "Agreement",
                "条款": "Terms and Conditions",
                "交货期": "Delivery Date",
                "装运期": "Shipment Date",
                "港到港": "Port to Port",
                "门到门": "Door to Door",
                "滞期费": "Demurrage",
                "速遣费": "Dispatch Money",
                "保险": "Insurance",
                "投保": "Insure",
                "理赔": "Claim Settlement",
                "拒付": "Dishonor",
                "承兑": "Acceptance",
                "付款交单": "D/P (Documents against Payment)",
                "承兑交单": "D/A (Documents against Acceptance)",
                "电汇": "T/T (Telegraphic Transfer)",
                "信用证": "L/C (Letter of Credit)",
                "托收": "Collection",
                "保理": "Factoring",
                "福费廷": "Forfaiting",
                "市场调研": "Market Research",
                "客户开发": "Customer Development",
                "供应商开发": "Supplier Development",
                "质量控制": "Quality Control (QC)",
                "生产进度": "Production Schedule",
                "交货延迟": "Delivery Delay",
                "索赔": "Claim",
                "争议解决": "Dispute Resolution",
                "仲裁": "Arbitration",
                "不可抗力": "Force Majeure",
                "违约责任": "Liability for Breach of Contract",
                "终止合同": "Terminate Contract",
                "续签合同": "Renew Contract",
                "补充协议": "Supplementary Agreement"
            },
            "en-zh": {
                "FOB": "FOB(船上交货价)",
                "Free On Board": "船上交货价(FOB)",
                "CIF": "CIF(成本加保险费加运费)",
                "Cost, Insurance and Freight": "成本加保险费加运费(CIF)",
                "CFR": "CFR(成本加运费)",
                "Cost and Freight": "成本加运费(CFR)",
                "EXW": "EXW(工厂交货)",
                "Ex Works": "工厂交货(EXW)",
                "DDP": "DDP(完税后交货)",
                "Delivered Duty Paid": "完税后交货(DDP)",
                "L/C": "信用证(L/C)",
                "Letter of Credit": "信用证(L/C)",
                "Bill of Lading": "提单(B/L)",
                "B/L": "提单",
                "Certificate of Origin": "原产地证",
                "Inspection Certificate": "商检证",
                "Packing List": "装箱单",
                "Commercial Invoice": "商业发票",
                "Customs Declaration": "报关单",
                "Customs Duty": "关税",
                "VAT": "增值税",
                "Value Added Tax": "增值税",
                "Tax Rebate": "退税",
                "Foreign Exchange": "外汇",
                "Exchange Rate": "汇率",
                "Quotation": "报价",
                "Counter Offer": "还盘",
                "Price Negotiation": "议价",
                "Rock-bottom Price": "最低价",
                "Ceiling Price": "最高价",
                "Commission": "佣金",
                "Discount": "折扣",
                "Sample": "样品",
                "Order": "订单",
                "Proforma Invoice": "形式发票",
                "P/I": "形式发票",
                "Contract": "合同",
                "Agreement": "协议",
                "Terms and Conditions": "条款",
                "Delivery Date": "交货期",
                "Shipment Date": "装运期",
                "Port to Port": "港到港",
                "Door to Door": "门到门",
                "Demurrage": "滞期费",
                "Dispatch Money": "速遣费",
                "Insurance": "保险",
                "Insure": "投保",
                "Claim Settlement": "理赔",
                "Dishonor": "拒付",
                "Acceptance": "承兑",
                "D/P": "付款交单",
                "Documents against Payment": "付款交单(D/P)",
                "D/A": "承兑交单",
                "Documents against Acceptance": "承兑交单(D/A)",
                "T/T": "电汇",
                "Telegraphic Transfer": "电汇(T/T)",
                "Collection": "托收",
                "Factoring": "保理",
                "Forfaiting": "福费廷",
                "Market Research": "市场调研",
                "Customer Development": "客户开发",
                "Supplier Development": "供应商开发",
                "Quality Control": "质量控制(QC)",
                "QC": "质量控制",
                "Production Schedule": "生产进度",
                "Delivery Delay": "交货延迟",
                "Claim": "索赔",
                "Dispute Resolution": "争议解决",
                "Arbitration": "仲裁",
                "Force Majeure": "不可抗力",
                "Breach of Contract": "违约",
                "Terminate Contract": "终止合同",
                "Renew Contract": "续签合同",
                "Supplementary Agreement": "补充协议"
            }
        }
    
    def _get_model_name(self, source_lang: str, target_lang: str) -> str:
        lang_map = {
            "zh": "zh",
            "en": "en",
            "ja": "jap",
            "ko": "kor",
            "fr": "fr",
            "de": "de",
            "es": "es"
        }
        
        src = lang_map.get(source_lang, source_lang)
        tgt = lang_map.get(target_lang, target_lang)
        
        return f"Helsinki-NLP/opus-mt-{src}-{tgt}"
    
    async def _load_model(self, source_lang: str, target_lang: str) -> bool:
        if not TRANSFORMERS_AVAILABLE:
            return False
        
        model_key = f"{source_lang}-{target_lang}"
        
        if model_key in self.models:
            return True
        
        try:
            model_name = self._get_model_name(source_lang, target_lang)
            print(f"Loading translation model: {model_name}")
            
            cache_dir = self.model_cache_dir
            os.makedirs(cache_dir, exist_ok=True)
            
            self.tokenizers[model_key] = MarianTokenizer.from_pretrained(
                model_name,
                cache_dir=cache_dir
            )
            self.models[model_key] = MarianMTModel.from_pretrained(
                model_name,
                cache_dir=cache_dir
            )
            
            print(f"Translation model {model_name} loaded successfully")
            return True
            
        except Exception as e:
            print(f"Error loading translation model {model_name}: {e}")
            return False
    
    def _optimize_business_terms(self, text: str, source_lang: str, target_lang: str) -> str:
        lang_pair = f"{source_lang}-{target_lang}"
        
        if lang_pair not in self._business_terms:
            return text
        
        terms = self._business_terms[lang_pair]
        
        for term, translation in sorted(terms.items(), key=lambda x: -len(x[0])):
            pattern = r'\b' + re.escape(term) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                text = re.sub(pattern, translation, text, flags=re.IGNORECASE)
        
        return text
    
    def _mock_translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        mock_translations = {
            "zh-en": {
                "你好": "Hello",
                "谢谢": "Thank you",
                "再见": "Goodbye",
                "早上好": "Good morning",
                "晚上好": "Good evening",
                "我想和你讨论一下合同条款。": "I would like to discuss the contract terms with you.",
                "请问你们的报价是多少？": "What is your quotation, please?",
                "我们可以接受L/C付款方式。": "We can accept L/C payment terms.",
                "交货期可以安排在下周。": "Delivery can be scheduled for next week.",
                "请提供形式发票。": "Please provide the proforma invoice.",
                "我们需要确认原产地证。": "We need to confirm the Certificate of Origin.",
                "价格谈判进展如何？": "How is the price negotiation progressing?",
                "我们可以给5%的折扣。": "We can offer a 5% discount.",
                "佣金是3%。": "The commission is 3%.",
                "请安排样品寄送。": "Please arrange for sample delivery.",
                "订单已确认。": "The order has been confirmed.",
                "合同已签署。": "The contract has been signed.",
                "请检查商业发票。": "Please check the commercial invoice.",
                "装箱单已准备好。": "The packing list is ready.",
                "提单什么时候可以拿到？": "When can we get the bill of lading?",
                "汇率是多少？": "What is the exchange rate?",
                "退税率是13%。": "The tax rebate rate is 13%.",
                "关税已支付。": "Customs duty has been paid.",
                "增值税发票已开具。": "VAT invoice has been issued.",
                "请安排电汇付款。": "Please arrange T/T payment.",
                "付款交单还是承兑交单？": "D/P or D/A?",
                "信用证已开立。": "Letter of Credit has been opened.",
                "保险已投保。": "Insurance has been arranged.",
                "滞期费需要确认。": "Demurrage needs to be confirmed.",
                "索赔已受理。": "The claim has been accepted.",
                "争议已解决。": "The dispute has been resolved.",
                "不可抗力条款已加入。": "Force Majeure clause has been added.",
                "合同已终止。": "The contract has been terminated.",
                "需要续签合同。": "Need to renew the contract.",
                "请提供补充协议。": "Please provide the supplementary agreement."
            },
            "en-zh": {
                "Hello": "你好",
                "Thank you": "谢谢",
                "Goodbye": "再见",
                "Good morning": "早上好",
                "Good evening": "晚上好",
                "I would like to discuss the contract terms with you.": "我想和你讨论一下合同条款。",
                "What is your quotation, please?": "请问你们的报价是多少？",
                "We can accept L/C payment terms.": "我们可以接受L/C付款方式。",
                "Delivery can be scheduled for next week.": "交货期可以安排在下周。",
                "Please provide the proforma invoice.": "请提供形式发票。",
                "We need to confirm the Certificate of Origin.": "我们需要确认原产地证。",
                "How is the price negotiation progressing?": "价格谈判进展如何？",
                "We can offer a 5% discount.": "我们可以给5%的折扣。",
                "The commission is 3%.": "佣金是3%。",
                "Please arrange for sample delivery.": "请安排样品寄送。",
                "The order has been confirmed.": "订单已确认。",
                "The contract has been signed.": "合同已签署。",
                "Please check the commercial invoice.": "请检查商业发票。",
                "The packing list is ready.": "装箱单已准备好。",
                "When can we get the bill of lading?": "提单什么时候可以拿到？",
                "What is the exchange rate?": "汇率是多少？",
                "The tax rebate rate is 13%.": "退税率是13%。",
                "Customs duty has been paid.": "关税已支付。",
                "VAT invoice has been issued.": "增值税发票已开具。",
                "Please arrange T/T payment.": "请安排电汇付款。",
                "D/P or D/A?": "付款交单还是承兑交单？",
                "Letter of Credit has been opened.": "信用证已开立。",
                "Insurance has been arranged.": "保险已投保。",
                "Demurrage needs to be confirmed.": "滞期费需要确认。",
                "The claim has been accepted.": "索赔已受理。",
                "The dispute has been resolved.": "争议已解决。",
                "Force Majeure clause has been added.": "不可抗力条款已加入。",
                "The contract has been terminated.": "合同已终止。",
                "Need to renew the contract.": "需要续签合同。",
                "Please provide the supplementary agreement.": "请提供补充协议。"
            }
        }
        
        lang_pair = f"{source_lang}-{target_lang}"
        
        if lang_pair in mock_translations and text in mock_translations[lang_pair]:
            translated = mock_translations[lang_pair][text]
        else:
            translated = f"[{target_lang.upper()}] {text}"
        
        return {
            "translated_text": translated,
            "confidence": 0.9,
            "source_language": source_lang,
            "target_language": target_lang
        }
    
    async def translate(
        self,
        source_text: str,
        source_language: str = "zh",
        target_language: str = "en",
        optimize_business: bool = True
    ) -> Dict[str, Any]:
        if optimize_business:
            source_text = self._optimize_business_terms(
                source_text, 
                source_language, 
                target_language
            )
        
        model_loaded = await self._load_model(source_language, target_language)
        
        if not model_loaded or not TRANSFORMERS_AVAILABLE:
            return self._mock_translate(source_text, source_language, target_language)
        
        try:
            model_key = f"{source_language}-{target_language}"
            tokenizer = self.tokenizers[model_key]
            model = self.models[model_key]
            
            inputs = tokenizer(source_text, return_tensors="pt", padding=True, truncation=True)
            outputs = model.generate(**inputs, max_length=512)
            
            translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            if optimize_business:
                translated_text = self._optimize_business_terms(
                    translated_text,
                    target_language,
                    target_language
                )
            
            return {
                "translated_text": translated_text,
                "confidence": 0.95,
                "source_language": source_language,
                "target_language": target_language
            }
            
        except Exception as e:
            print(f"Translation error: {e}")
            return self._mock_translate(source_text, source_language, target_language)
