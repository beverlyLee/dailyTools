import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Invoice, TrainTicket, AirTicket
from app.config import settings

class RulesEngine:
    def __init__(self, db: Session):
        self.db = db
        self.company_name = settings.COMPANY_NAME
    
    def verify_invoice_authenticity(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        result = {
            "verified": False,
            "status": "unknown",
            "message": "",
            "details": {}
        }
        
        if settings.TAX_VERIFICATION_API == "mock":
            return self._mock_verify_invoice(invoice_data)
        
        return result
    
    def _mock_verify_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        invoice_code = invoice_data.get("invoice_code", "")
        invoice_number = invoice_data.get("invoice_number", "")
        
        if len(invoice_code) != 12 and len(invoice_code) != 10:
            return {
                "verified": False,
                "status": "failed",
                "message": "发票代码格式不正确",
                "details": {"error": "发票代码长度应为10位或12位"}
            }
        
        if len(invoice_number) != 8:
            return {
                "verified": False,
                "status": "failed",
                "message": "发票号码格式不正确",
                "details": {"error": "发票号码长度应为8位"}
            }
        
        return {
            "verified": True,
            "status": "success",
            "message": "发票验真通过（模拟接口）",
            "details": {
                "invoice_code": invoice_code,
                "invoice_number": invoice_number,
                "verification_time": datetime.now().isoformat()
            }
        }
    
    def check_invoice_title_match(self, buyer_name: str) -> Dict[str, Any]:
        result = {
            "matched": False,
            "message": "",
            "details": {}
        }
        
        if not buyer_name:
            result["message"] = "购买方名称为空"
            result["details"] = {"error": "购买方名称不能为空"}
            return result
        
        normalized_buyer = self._normalize_name(buyer_name)
        normalized_company = self._normalize_name(self.company_name)
        
        if normalized_buyer in normalized_company or normalized_company in normalized_buyer:
            result["matched"] = True
            result["message"] = "发票抬头与报销单位一致"
            result["details"] = {
                "buyer_name": buyer_name,
                "company_name": self.company_name
            }
        else:
            result["matched"] = False
            result["message"] = "发票抬头与报销单位不一致"
            result["details"] = {
                "buyer_name": buyer_name,
                "company_name": self.company_name,
                "error": "请确认发票抬头是否正确"
            }
        
        return result
    
    def _normalize_name(self, name: str) -> str:
        if not name:
            return ""
        name = re.sub(r'[（(][^）)]*[）)]', '', name)
        name = re.sub(r'[（(]', '', name)
        name = re.sub(r'[）)]', '', name)
        name = re.sub(r'[，。、；：""''（）【】《》\s]', '', name)
        return name
    
    def check_duplicate_invoice(
        self, 
        invoice_code: str, 
        invoice_number: str,
        invoice_type: str = "invoice"
    ) -> Dict[str, Any]:
        result = {
            "is_duplicate": False,
            "message": "",
            "details": {}
        }
        
        if not invoice_code or not invoice_number:
            result["message"] = "发票代码或号码为空"
            result["details"] = {"error": "发票代码和号码不能为空"}
            return result
        
        existing_invoice = None
        
        if invoice_type == "invoice":
            existing_invoice = self.db.query(Invoice).filter(
                Invoice.invoice_code == invoice_code,
                Invoice.invoice_number == invoice_number
            ).first()
        elif invoice_type == "train":
            existing_invoice = self.db.query(TrainTicket).filter(
                TrainTicket.ticket_number == invoice_number
            ).first()
        elif invoice_type == "air":
            existing_invoice = self.db.query(AirTicket).filter(
                AirTicket.ticket_number == invoice_number
            ).first()
        
        if existing_invoice:
            result["is_duplicate"] = True
            result["message"] = "发现重复票据"
            result["details"] = {
                "invoice_code": invoice_code,
                "invoice_number": invoice_number,
                "existing_id": existing_invoice.id,
                "is_reimbursed": getattr(existing_invoice, 'is_reimbursed', False),
                "created_at": existing_invoice.created_at.isoformat() if hasattr(existing_invoice, 'created_at') else None
            }
        else:
            result["is_duplicate"] = False
            result["message"] = "未发现重复票据"
            result["details"] = {
                "invoice_code": invoice_code,
                "invoice_number": invoice_number
            }
        
        return result
    
    def run_all_validations(
        self, 
        invoice_data: Dict[str, Any],
        invoice_type: str = "invoice"
    ) -> Dict[str, Any]:
        results = {
            "overall_status": "pending",
            "validations": [],
            "summary": ""
        }
        
        authenticity_result = self.verify_invoice_authenticity(invoice_data)
        results["validations"].append({
            "type": "authenticity",
            "name": "发票真伪校验",
            "result": authenticity_result
        })
        
        if invoice_type == "invoice":
            buyer_name = invoice_data.get("buyer_name", "")
            title_result = self.check_invoice_title_match(buyer_name)
            results["validations"].append({
                "type": "title_match",
                "name": "发票抬头校验",
                "result": title_result
            })
        
        if invoice_type == "invoice":
            invoice_code = invoice_data.get("invoice_code", "")
            invoice_number = invoice_data.get("invoice_number", "")
        else:
            invoice_code = ""
            invoice_number = invoice_data.get("ticket_number", "")
        
        duplicate_result = self.check_duplicate_invoice(
            invoice_code, 
            invoice_number,
            invoice_type
        )
        results["validations"].append({
            "type": "duplicate_check",
            "name": "重复报销校验",
            "result": duplicate_result
        })
        
        all_passed = True
        errors = []
        
        for validation in results["validations"]:
            if validation["type"] == "authenticity":
                if not validation["result"].get("verified", False):
                    all_passed = False
                    errors.append("发票真伪校验失败")
            elif validation["type"] == "title_match":
                if not validation["result"].get("matched", False):
                    all_passed = False
                    errors.append("发票抬头校验失败")
            elif validation["type"] == "duplicate_check":
                if validation["result"].get("is_duplicate", False):
                    all_passed = False
                    errors.append("发现重复发票")
        
        if all_passed:
            results["overall_status"] = "passed"
            results["summary"] = "所有校验通过"
        else:
            results["overall_status"] = "failed"
            results["summary"] = "校验失败: " + "；".join(errors)
        
        return results
