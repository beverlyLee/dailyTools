import asyncio
import os
import re
import json
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from datetime import datetime
from config import settings

class BaseOCREngine(ABC):
    @abstractmethod
    async def recognize(self, image_path: str) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def extract_fields(self, ocr_result: Dict) -> Dict[str, Any]:
        pass

class PaddleOCREngine(BaseOCREngine):
    def __init__(self):
        self._ocr = None
        self._initialized = False
    
    async def _ensure_loaded(self):
        if not self._initialized:
            try:
                from paddleocr import PaddleOCR
                self._ocr = PaddleOCR(
                    use_angle_cls=True,
                    lang="ch",
                    show_log=False
                )
                self._initialized = True
            except Exception as e:
                print(f"Failed to load PaddleOCR: {e}")
                raise
    
    async def recognize(self, image_path: str) -> Dict[str, Any]:
        await self._ensure_loaded()
        
        result = self._ocr.ocr(image_path, cls=True)
        
        text_lines = []
        all_text = ""
        
        if result and result[0]:
            for line in result[0]:
                if line:
                    bbox = line[0]
                    text_info = line[1]
                    if text_info:
                        text = text_info[0]
                        confidence = text_info[1]
                        text_lines.append({
                            "text": text,
                            "confidence": float(confidence),
                            "bbox": bbox
                        })
                        all_text += text + "\n"
        
        return {
            "text_lines": text_lines,
            "all_text": all_text,
            "engine": "paddleocr"
        }
    
    def extract_fields(self, ocr_result: Dict) -> Dict[str, Any]:
        all_text = ocr_result.get("all_text", "")
        text_lines = ocr_result.get("text_lines", [])
        
        fields = {}
        
        invoice_type = self._detect_invoice_type(all_text, text_lines)
        fields["invoice_type"] = invoice_type
        
        if invoice_type == "vat_invoice":
            fields.update(self._extract_vat_invoice(all_text, text_lines))
        elif invoice_type == "train_ticket":
            fields.update(self._extract_train_ticket(all_text, text_lines))
        elif invoice_type == "flight_ticket":
            fields.update(self._extract_flight_ticket(all_text, text_lines))
        else:
            fields.update(self._extract_general(all_text, text_lines))
        
        return fields
    
    def _detect_invoice_type(self, all_text: str, text_lines: List) -> str:
        text_upper = all_text.upper()
        
        if any(keyword in all_text for keyword in ["增值税", "发票", "发票代码", "发票号码"]:
            return "vat_invoice"
        elif any(keyword in all_text for keyword in ["火车票", "铁路", "车次", "车厢"]):
            return "train_ticket"
        elif any(keyword in all_text for keyword in ["机票", "航班", "登机牌", "航空公司"]):
            return "flight_ticket"
        else:
            return "receipt"
    
    def _extract_vat_invoice(self, all_text: str, text_lines: List) -> Dict:
        fields = {}
        
        code_match = re.search(r'发票代码[：:]\s*(\d+)', all_text)
        if code_match:
            fields["invoice_code"] = code_match.group(1)
        
        number_match = re.search(r'发票号码[：:]\s*(\d+)', all_text)
        if number_match:
            fields["invoice_number"] = number_match.group(1)
        
        check_match = re.search(r'校验码[：:]\s*([\d\s]+)', all_text)
        if check_match:
            fields["check_code"] = check_match.group(1).replace(" ", "")
        
        date_match = re.search(r'开票日期[：:]\s*(\d{4}[-年]\d{2}[-月]\d{2}[日]?', all_text)
        if date_match:
            date_str = date_match.group(1)
            date_str = date_str.replace("年", "-").replace("月", "-").replace("日", "")
            try:
                fields["invoice_date"] = date_str
            except:
                pass
        
        seller_name_match = re.search(r'名称[：:]\s*([^\n]+)', all_text)
        if seller_name_match:
            fields["seller_name"] = seller_name_match.group(1).strip()
        
        seller_tax_match = re.search(r'纳税人识别号[：:]\s*([A-Z0-9]+)', all_text)
        if seller_tax_match:
            fields["seller_tax_id"] = seller_tax_match.group(1)
        
        total_amount_match = re.search(r'金额[：:]\s*[￥¥]?([\d,\.]+)', all_text)
        if total_amount_match:
            fields["total_amount"] = total_amount_match.group(1).replace(",", "")
        
        tax_match = re.search(r'税额[：:]\s*[￥¥]?([\d,\.]+)', all_text)
        if tax_match:
            fields["total_tax"] = tax_match.group(1).replace(",", "")
        
        total_with_tax_match = re.search(r'(?:价税合计|小写)[：:]\s*[￥¥]?([\d,\.]+)', all_text)
        if total_with_tax_match:
            fields["total_amount_with_tax"] = total_with_tax_match.group(1).replace(",", "")
        
        buyer_match = re.search(r'购买方.*?名称[：:]\s*([^\n]+)', all_text, re.DOTALL)
        if buyer_match:
            fields["buyer_name"] = buyer_match.group(1).strip()
        
        return fields
    
    def _extract_train_ticket(self, all_text: str, text_lines: List) -> Dict:
        fields = {"invoice_type": "train_ticket"}
        
        train_match = re.search(r'[CGDKZT][\d]+', all_text)
        if train_match:
            fields["train_number"] = train_match.group(0)
        
        date_match = re.search(r'(\d{4}年\d{2}月\d{2}日)', all_text)
        if date_match:
            fields["invoice_date"] = date_match.group(1)
        
        from_match = re.search(r'([^\n]+?站\s*[-—→]\s*([^\n]+?站)', all_text)
        if from_match:
            fields["from_station"] = from_match.group(1)
            fields["to_station"] = from_match.group(2)
        
        price_match = re.search(r'[￥¥]\s*([\d,\.]+)', all_text)
        if price_match:
            fields["total_amount_with_tax"] = price_match.group(1).replace(",", "")
            fields["total_amount"] = price_match.group(1).replace(",", "")
        
        seat_match = re.search(r'[软硬座卧一等二等商务', all_text)
        if seat_match:
            fields["seat_type"] = seat_match.group(0)
        
        return fields
    
    def _extract_flight_ticket(self, all_text: str, text_lines: List) -> Dict:
        fields = {"invoice_type": "flight_ticket"}
        
        flight_match = re.search(r'[A-Z]{2}\d{3,6}', all_text)
        if flight_match:
            fields["flight_number"] = flight_match.group(0)
        
        date_match = re.search(r'(\d{4}[-年]\d{2}[-月]\d{2})', all_text)
        if date_match:
            fields["invoice_date"] = date_match.group(1)
        
        from_match = re.search(r'([A-Z]{3})\s*[-—→]\s*([A-Z]{3})', all_text)
        if from_match:
            fields["from_city"] = from_match.group(1)
            fields["to_city"] = from_match.group(2)
        
        price_match = re.search(r'[￥¥]\s*([\d,\.]+)', all_text)
        if price_match:
            fields["total_amount_with_tax"] = price_match.group(1).replace(",", "")
            fields["total_amount"] = price_match.group(1).replace(",", "")
        
        airline_match = re.search(r'(航空|航空|AIRLINE|AIRWAYS)', all_text, re.IGNORECASE)
        if airline_match:
            fields["airline"] = airline_match.group(1)
        
        return fields
    
    def _extract_general(self, all_text: str, text_lines: List) -> Dict:
        fields = {"invoice_type": "receipt"}
        
        date_match = re.search(r'(\d{4}[-年/]\d{2}[-月/]\d{2})', all_text)
        if date_match:
            fields["invoice_date"] = date_match.group(1)
        
        amount_match = re.search(r'[￥¥]\s*([\d,\.]+)', all_text)
        if amount_match:
            fields["total_amount_with_tax"] = amount_match.group(1).replace(",", "")
            fields["total_amount"] = amount_match.group(1).replace(",", "")
        
        return fields

class SimulatedOCREngine(BaseOCREngine):
    async def recognize(self, image_path: str) -> Dict[str, Any]:
        import random
        
        sample_invoices = [
            {
                "type": "vat_invoice",
                "all_text": """增值税专用发票
发票代码：011002300111
发票号码：20231234
开票日期：2023年12月15日
校验码：1234 5678 9012 3456

购买方
名称：某某科技有限公司
纳税人识别号：91110108MA01234567
地址、电话：北京市朝阳区某某路88号 010-12345678
开户行及账号：工商银行北京朝阳支行 0200000012345678901

销售方
名称：某某贸易有限公司
纳税人识别号：91110105MA07654321
地址、电话：北京市海淀区某某路66号 010-87654321
开户行及账号：建设银行北京海淀支行 11001234567800001234

货物或应税劳务、服务名称
办公用品
咨询服务费

金额：￥1,500.00
税额：￥90.00
价税合计（小写）：￥1,590.00
价税合计（大写）：壹仟伍佰玖拾元整

收款人：张三
复核：李四
开票人：王五
销售方：（章）
""",
                "confidence": 0.95
            },
            {
                "type": "train_ticket",
                "all_text": """中国铁路
火车票

北京南站 → 上海虹桥站
G123次
2023年12月15日 08:00开
06车08A号
二等座
￥553.00
售票站：北京南
检票口：12A
""",
                "confidence": 0.92
            },
            {
                "type": "flight_ticket",
                "all_text": """中国国际航空
电子客票行程单

航班号：CA1234
北京首都PEK → 上海虹桥SHA
2023-12-15 10:00-12:15
舱位：经济舱Y
票价：￥1,200.00
机场建设费：￥50.00
燃油附加费：￥100.00
合计：￥1,350.00
""",
                "confidence": 0.90
            }
        ]
        
        selected = random.choice(sample_invoices)
        
        return {
            "text_lines": [{"text": line, "confidence": selected["confidence"]} for line in selected["all_text"].split("\n")],
            "all_text": selected["all_text"],
            "engine": "simulated"
        }
    
    def extract_fields(self, ocr_result: Dict) -> Dict[str, Any]:
        all_text = ocr_result.get("all_text", "")
        text_lines = ocr_result.get("text_lines", [])
        
        fields = {}
        
        engine = PaddleOCREngine()
        fields = engine._detect_invoice_type(all_text, text_lines)
        
        if "增值税" in all_text or "发票代码" in all_text:
            fields["invoice_type"] = "vat_invoice"
            
            code_match = re.search(r'发票代码[：:]\s*(\d+)', all_text)
            if code_match:
                fields["invoice_code"] = code_match.group(1)
            
            number_match = re.search(r'发票号码[：:]\s*(\d+)', all_text)
            if number_match:
                fields["invoice_number"] = number_match.group(1)
            
            date_match = re.search(r'开票日期[：:]\s*(\d{4}[-年]\d{2}[-月]\d{2}[日]?', all_text)
            if date_match:
                fields["invoice_date"] = date_match.group(1)
            
            seller_match = re.search(r'销售方.*?名称[：:]\s*([^\n]+)', all_text, re.DOTALL)
            if seller_match:
                fields["seller_name"] = seller_match.group(1).strip()
            
            buyer_match = re.search(r'购买方.*?名称[：:]\s*([^\n]+)', all_text, re.DOTALL)
            if buyer_match:
                fields["buyer_name"] = buyer_match.group(1).strip()
            
            amount_match = re.search(r'金额[：:]\s*[￥¥]?([\d,\.]+)', all_text)
            if amount_match:
                fields["total_amount"] = amount_match.group(1).replace(",", "")
            
            tax_match = re.search(r'税额[：:]\s*[￥¥]?([\d,\.]+)', all_text)
            if tax_match:
                fields["total_tax"] = tax_match.group(1).replace(",", "")
            
            total_match = re.search(r'价税合计.*?[￥¥]([\d,\.]+)', all_text)
            if total_match:
                fields["total_amount_with_tax"] = total_match.group(1).replace(",", "")
        
        elif "火车票" in all_text or "G\d+" in all_text:
            fields["invoice_type"] = "train_ticket"
            
            train_match = re.search(r'[CGDKTZP]\d+', all_text)
            if train_match:
                fields["train_number"] = train_match.group(0)
            
            date_match = re.search(r'(\d{4}年\d{2}月\d{2}日)', all_text)
            if date_match:
                fields["invoice_date"] = date_match.group(1)
            
            price_match = re.search(r'[￥¥]\s*([\d,\.]+)', all_text)
            if price_match:
                fields["total_amount_with_tax"] = price_match.group(1).replace(",", "")
                fields["total_amount"] = price_match.group(1).replace(",", "")
        
        elif "航班" in all_text or "机票" in all_text or "CA\d+" in all_text:
            fields["invoice_type"] = "flight_ticket"
            
            flight_match = re.search(r'[A-Z]{2}\d+', all_text)
            if flight_match:
                fields["flight_number"] = flight_match.group(0)
            
            date_match = re.search(r'(\d{4}[-年]\d{2}[-月]\d{2})', all_text)
            if date_match:
                fields["invoice_date"] = date_match.group(1)
            
            price_match = re.search(r'合计[：:]\s*[￥¥]([\d,\.]+)', all_text)
            if price_match:
                fields["total_amount_with_tax"] = price_match.group(1).replace(",", "")
                fields["total_amount"] = price_match.group(1).replace(",", "")
        
        else:
            fields["invoice_type"] = "receipt"
        
        return fields

def get_ocr_engine() -> BaseOCREngine:
    engine_name = settings.OCR_ENGINE.lower()
    
    if engine_name == "paddleocr":
        try:
            return PaddleOCREngine()
        except Exception as e:
            print(f"Failed to initialize PaddleOCR, using simulated OCR: {e}")
            return SimulatedOCREngine()
    else:
        return SimulatedOCREngine()

ocr_engine = get_ocr_engine()
