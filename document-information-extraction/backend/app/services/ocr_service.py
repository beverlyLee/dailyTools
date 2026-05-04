import os
import json
import re
from typing import Dict, Any
from datetime import datetime
from app.config import settings

try:
    from paddleocr import PaddleOCR, draw_ocr
    HAS_PADDLEOCR = True
except ImportError:
    HAS_PADDLEOCR = False

class OCRService:
    def __init__(self):
        self.ocr = None
        if HAS_PADDLEOCR:
            self.ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
        self.text_mock_data = {
            "发票代码": "013002000111",
            "发票号码": "21830005",
            "开票日期": "2024年05月04日",
            "金额": "1000.00",
            "税额": "60.00",
            "价税合计": "1060.00",
            "销售方": "某某科技有限公司",
            "销售方纳税人识别号": "91110106MA01234567",
            "购买方": "某某有限公司",
            "购买方纳税人识别号": "91110108MA07654321"
        }
    
    def analyze_document(self, image_path: str) -> Dict[str, Any]:
        if self.ocr:
            return self._paddleocr_analyze(image_path)
        else:
            return self._mock_analyze(image_path)
    
    def _paddleocr_analyze(self, image_path: str) -> Dict[str, Any]:
        result = self.ocr.ocr(image_path, cls=True)
        raw_text = []
        extracted_data = {
            "invoice_code": "",
            "invoice_number": "",
            "invoice_date": "",
            "amount": 0.0,
            "tax_amount": 0.0,
            "total_amount": 0.0,
            "seller_name": "",
            "seller_tax_id": "",
            "buyer_name": "",
            "buyer_tax_id": "",
            "raw_text": ""
        }
        
        for line in result:
            if line:
                for word_info in line:
                    text = word_info[1][0]
                    raw_text.append(text)
                    
                    code_match = re.search(r'发票代码[：:]\s*(\d+)', text)
                    if code_match:
                        extracted_data["invoice_code"] = code_match.group(1)
                    
                    number_match = re.search(r'发票号码[：:]\s*(\d+)', text)
                    if number_match:
                        extracted_data["invoice_number"] = number_match.group(1)
                    
                    date_match = re.search(r'(\d{4}年\d{2}月\d{2}日)', text)
                    if date_match:
                        extracted_data["invoice_date"] = date_match.group(1)
                    
                    amount_match = re.search(r'金额[：:]\s*[￥¥]?(\d+\.?\d*)', text)
                    if amount_match:
                        extracted_data["amount"] = float(amount_match.group(1))
                    
                    tax_match = re.search(r'税额[：:]\s*[￥¥]?(\d+\.?\d*)', text)
                    if tax_match:
                        extracted_data["tax_amount"] = float(tax_match.group(1))
                    
                    total_match = re.search(r'价税合计[：:]\s*[￥¥]?(\d+\.?\d*)', text)
                    if total_match:
                        extracted_data["total_amount"] = float(total_match.group(1))
                    
                    seller_match = re.search(r'销售方[：:]\s*(\S+)', text)
                    if seller_match:
                        extracted_data["seller_name"] = seller_match.group(1)
                    
                    buyer_match = re.search(r'购买方[：:]\s*(\S+)', text)
                    if buyer_match:
                        extracted_data["buyer_name"] = buyer_match.group(1)
                    
                    tax_id_match = re.search(r'(\d{15}|\d{17}[\dXx]|\d{18})', text)
                    if tax_id_match:
                        if not extracted_data["seller_tax_id"]:
                            extracted_data["seller_tax_id"] = tax_id_match.group(1)
                        elif not extracted_data["buyer_tax_id"]:
                            extracted_data["buyer_tax_id"] = tax_id_match.group(1)
        
        extracted_data["raw_text"] = "\n".join(raw_text)
        return extracted_data
    
    def _mock_analyze(self, image_path: str) -> Dict[str, Any]:
        mock_data = {
            "invoice_code": "013002000111",
            "invoice_number": "21830005",
            "invoice_date": "2024年05月04日",
            "amount": 1000.00,
            "tax_amount": 60.00,
            "total_amount": 1060.00,
            "seller_name": "某某科技有限公司",
            "seller_tax_id": "91110106MA01234567",
            "buyer_name": "某某有限公司",
            "buyer_tax_id": "91110108MA07654321",
            "raw_text": "模拟OCR文本内容"
        }
        return mock_data
    
    def analyze_train_ticket(self, image_path: str) -> Dict[str, Any]:
        mock_data = {
            "ticket_number": "1234567890",
            "departure_station": "北京南",
            "arrival_station": "上海虹桥",
            "departure_time": "2024-05-10 08:30:00",
            "train_number": "G1",
            "seat_class": "二等座",
            "price": 553.0,
            "passenger_name": "张三",
            "id_number": "110101199001011234",
            "raw_text": "模拟火车票OCR文本"
        }
        return mock_data
    
    def analyze_air_ticket(self, image_path: str) -> Dict[str, Any]:
        mock_data = {
            "ticket_number": "CA1234567890",
            "departure_airport": "北京首都国际机场",
            "arrival_airport": "广州白云国际机场",
            "departure_time": "2024-05-15 10:00:00",
            "flight_number": "CA1234",
            "cabin_class": "经济舱",
            "price": 1200.0,
            "tax": 100.0,
            "total_amount": 1300.0,
            "passenger_name": "李四",
            "id_number": "110101199001014321",
            "airline": "中国国际航空",
            "raw_text": "模拟机票OCR文本"
        }
        return mock_data

ocr_service = OCRService()
