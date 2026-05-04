from typing import Dict, Any, Optional, List
from pathlib import Path
import logging
import re
from datetime import datetime

from ..config import settings

logger = logging.getLogger(__name__)

try:
    from paddleocr import PaddleOCR
    HAS_PADDLEOCR = True
except ImportError:
    HAS_PADDLEOCR = False
    logger.warning("PaddleOCR not installed. OCR functionality will be limited.")


class OCRService:
    def __init__(self):
        self._ocr: Optional[Any] = None
        self._lang = settings.OCR_LANG
    
    def _get_ocr(self):
        if self._ocr is None:
            if not HAS_PADDLEOCR:
                raise RuntimeError("PaddleOCR is not installed")
            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang=self._lang,
                show_log=False,
                use_gpu=False
            )
        return self._ocr
    
    def recognize_image(self, image_path: Path) -> Dict[str, Any]:
        if not image_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        ocr = self._get_ocr()
        
        result = ocr.ocr(str(image_path), cls=True)
        
        texts = []
        bounding_boxes = []
        confidences = []
        
        if result and result[0]:
            for line in result[0]:
                box = line[0]
                text_info = line[1]
                if text_info:
                    text, confidence = text_info
                    texts.append(text)
                    bounding_boxes.append(box)
                    confidences.append(confidence)
        
        full_text = "\n".join(texts)
        
        return {
            "success": True,
            "text": full_text,
            "text_lines": texts,
            "bounding_boxes": bounding_boxes,
            "confidences": confidences,
            "language": self._lang,
            "processed_at": datetime.utcnow().isoformat()
        }
    
    def extract_passport_fields(self, text: str) -> Dict[str, Any]:
        fields = {}
        
        passport_patterns = [
            (r'P<([A-Z]{3})<([A-Z]+)<<([A-Z]+)<*', 'mrz_line1'),
            (r'([A-Z0-9]{9})([A-Z])([A-Z]{3})(\d{6})([MF])(\d{6})([A-Z0-9]{14})([A-Z])', 'mrz_line2'),
        ]
        
        for pattern, field_name in passport_patterns:
            match = re.search(pattern, text.upper())
            if match:
                fields[field_name] = match.group(0)
                if field_name == 'mrz_line2':
                    if len(match.groups()) >= 8:
                        fields['passport_number'] = match.group(1)
                        fields['nationality_code'] = match.group(3)
                        fields['date_of_birth'] = match.group(4)
                        fields['gender'] = match.group(5)
                        fields['expiry_date'] = match.group(6)
        
        simple_patterns = [
            (r'(?:PASSPORT|Passport)\s*(?:NO|No|Number|#)?[:\s]*([A-Z0-9]+)', 'passport_number'),
            (r'(?:Surname|Last Name|Family Name)[:\s]*([A-Za-z\s]+)', 'surname'),
            (r'(?:Given Names?|First Name)[:\s]*([A-Za-z\s]+)', 'given_name'),
            (r'(?:Date of Birth|DOB|Birth Date)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', 'date_of_birth'),
            (r'(?:Date of Expiry|Expiry Date|Valid Until)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', 'expiry_date'),
            (r'(?:Nationality|Country)[:\s]*([A-Za-z\s]+)', 'nationality'),
            (r'(?:Sex|Gender)[:\s]*([MF])', 'gender'),
        ]
        
        for pattern, field_name in simple_patterns:
            if field_name not in fields:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    if value:
                        fields[field_name] = value
        
        return fields
    
    def extract_general_fields(self, text: str, document_type: Optional[str] = None) -> Dict[str, Any]:
        fields = {}
        
        if document_type == 'passport':
            return self.extract_passport_fields(text)
        
        date_patterns = [
            (r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', 'dates'),
            (r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})', 'dates'),
        ]
        
        dates = []
        for pattern, _ in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        if dates:
            fields['dates_found'] = list(set(dates))
        
        number_patterns = [
            (r'(?:ID|Application|Reference|Receipt|Confirmation)\s*(?:NO|No|Number|#)?[:\s]*([A-Z0-9\-]+)', 'identification_number'),
            (r'GWF[A-Z0-9]+', 'gwf_number'),
            (r'SEVIS\s*ID[:\s]*([A-Z0-9]+)', 'sevis_id'),
        ]
        
        for pattern, field_name in number_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields[field_name] = match.group(1) if match.groups() else match.group(0)
        
        amount_patterns = [
            (r'\$[\d,]+\.?\d*', 'usd_amounts'),
            (r'€[\d,]+\.?\d*', 'eur_amounts'),
            (r'£[\d,]+\.?\d*', 'gbp_amounts'),
            (r'¥[\d,]+\.?\d*', 'jpy_amounts'),
        ]
        
        for pattern, field_name in amount_patterns:
            matches = re.findall(pattern, text)
            if matches:
                fields[field_name] = matches
        
        return fields
    
    def process_document(
        self,
        image_path: Path,
        document_type: Optional[str] = None
    ) -> Dict[str, Any]:
        ocr_result = self.recognize_image(image_path)
        
        if ocr_result["success"]:
            extracted_fields = self.extract_general_fields(
                ocr_result["text"],
                document_type
            )
            ocr_result["extracted_fields"] = extracted_fields
        
        return ocr_result


class MockOCRService(OCRService):
    def __init__(self):
        super().__init__()
    
    def _get_ocr(self):
        return None
    
    def recognize_image(self, image_path: Path) -> Dict[str, Any]:
        logger.info(f"Mock OCR processing: {image_path}")
        
        mock_texts = [
            "PASSPORT NUMBER: E12345678",
            "SURNAME: ZHANG",
            "GIVEN NAMES: WEI",
            "DATE OF BIRTH: 15/03/1990",
            "NATIONALITY: CHINESE",
            "DATE OF EXPIRY: 20/12/2030",
            "SEX: M",
        ]
        
        full_text = "\n".join(mock_texts)
        
        return {
            "success": True,
            "text": full_text,
            "text_lines": mock_texts,
            "bounding_boxes": [],
            "confidences": [0.95] * len(mock_texts),
            "language": self._lang,
            "processed_at": datetime.utcnow().isoformat(),
            "note": "Mock OCR result - install PaddleOCR for actual OCR"
        }


def get_ocr_service() -> OCRService:
    if HAS_PADDLEOCR:
        return OCRService()
    else:
        logger.warning("Using MockOCRService - PaddleOCR not installed")
        return MockOCRService()


ocr_service = get_ocr_service()
