import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from config import settings
from database import Invoice, Company, VerificationRecord

class VerificationRule:
    def __init__(self, rule_id: str, rule_name: str, rule_type: str, description: str = ""):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.rule_type = rule_type
        self.description = description
        self.is_passed = False
        self.message = ""
        self.details = {}
    
    def to_dict(self) -> Dict:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "rule_type": self.rule_type,
            "description": self.description,
            "is_passed": self.is_passed,
            "message": self.message,
            "details": self.details
        }

class BaseVerificationEngine(ABC):
    @abstractmethod
    async def verify(self, invoice: Invoice, db: AsyncSession) -> Tuple[bool, List[VerificationRule]]:
        pass

class TaxVerificationEngine(BaseVerificationEngine):
    async def verify(self, invoice: Invoice, db: AsyncSession) -> Tuple[bool, List[VerificationRule]]:
        rules = []
        
        rules.append(self._check_invoice_code(invoice))
        rules.append(self._check_invoice_number(invoice))
        rules.append(self._check_invoice_date(invoice))
        rules.append(self._check_amounts(invoice))
        rules.append(await self._check_duplicate(invoice, db))
        rules.append(await self._check_buyer_company(invoice, db))
        rules.append(self._check_tax_id_format(invoice))
        rules.append(self._check_seal(invoice))
        
        all_passed = all(rule.is_passed for rule in rules)
        
        return all_passed, rules
    
    def _check_invoice_code(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "code_format",
            "发票代码格式校验",
            "format",
            "校验发票代码是否符合规范格式"
        )
        
        if not invoice.invoice_code:
            rule.is_passed = False
            rule.message = "发票代码为空"
            return rule
        
        code = invoice.invoice_code.strip()
        
        if not re.match(r'^\d{10,12}$', code):
            rule.is_passed = False
            rule.message = f"发票代码格式不正确，应为10-12位数字，当前长度: {len(code)}"
            rule.details = {"code": code, "expected_length": "10-12"}
            return rule
        
        rule.is_passed = True
        rule.message = "发票代码格式正确"
        return rule
    
    def _check_invoice_number(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "number_format",
            "发票号码格式校验",
            "format",
            "校验发票号码是否符合规范格式"
        )
        
        if not invoice.invoice_number:
            rule.is_passed = False
            rule.message = "发票号码为空"
            return rule
        
        number = invoice.invoice_number.strip()
        
        if not re.match(r'^\d{8,10}$', number):
            rule.is_passed = False
            rule.message = f"发票号码格式不正确，应为8-10位数字，当前长度: {len(number)}"
            rule.details = {"number": number, "expected_length": "8-10"}
            return rule
        
        rule.is_passed = True
        rule.message = "发票号码格式正确"
        return rule
    
    def _check_invoice_date(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "date_valid",
            "开票日期校验",
            "date",
            "校验开票日期是否有效且未超过报销期限"
        )
        
        if not invoice.invoice_date:
            rule.is_passed = True
            rule.message = "开票日期为空，跳过校验"
            return rule
        
        now = datetime.now()
        invoice_dt = invoice.invoice_date
        
        if invoice_dt > now:
            rule.is_passed = False
            rule.message = "开票日期不能晚于当前日期"
            rule.details = {
                "invoice_date": invoice_dt.isoformat(),
                "current_date": now.isoformat()
            }
            return rule
        
        days_diff = (now - invoice_dt).days
        if days_diff > 365:
            rule.is_passed = False
            rule.message = f"发票已超过报销期限（{days_diff}天，超过365天）"
            rule.details = {"days_since_issue": days_diff, "max_allowed_days": 365}
            return rule
        
        rule.is_passed = True
        rule.message = f"开票日期有效（开票后{days_diff}天）"
        return rule
    
    def _check_amounts(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "amount_consistency",
            "金额一致性校验",
            "math",
            "校验金额、税额、价税合计是否一致"
        )
        
        amount = invoice.total_amount or Decimal(0)
        tax = invoice.total_tax or Decimal(0)
        total_with_tax = invoice.total_amount_with_tax or Decimal(0)
        
        if total_with_tax == 0:
            rule.is_passed = True
            rule.message = "金额为空，跳过校验"
            return rule
        
        expected_total = amount + tax
        
        if abs(expected_total - total_with_tax) > Decimal("0.01"):
            rule.is_passed = False
            rule.message = f"金额不一致：金额+税额={float(expected_total)}，价税合计={float(total_with_tax)}"
            rule.details = {
                "total_amount": float(amount),
                "total_tax": float(tax),
                "expected_total": float(expected_total),
                "actual_total": float(total_with_tax)
            }
            return rule
        
        rule.is_passed = True
        rule.message = "金额一致性校验通过"
        return rule
    
    async def _check_duplicate(self, invoice: Invoice, db: AsyncSession) -> VerificationRule:
        rule = VerificationRule(
            "duplicate_check",
            "重复报销校验",
            "duplicate",
            "检查发票是否已存在或已报销"
        )
        
        if not invoice.invoice_code or not invoice.invoice_number:
            rule.is_passed = True
            rule.message = "发票代码或号码为空，跳过重复校验"
            return rule
        
        query = select(Invoice).where(
            and_(
                Invoice.invoice_code == invoice.invoice_code,
                Invoice.invoice_number == invoice.invoice_number,
                Invoice.id != invoice.id if invoice.id else True
            )
        )
        
        result = await db.execute(query)
        existing = result.scalars().first()
        
        if existing:
            rule.is_passed = False
            if existing.is_reimbursed:
                rule.message = f"发票已报销（ID: {existing.id}）"
            else:
                rule.message = f"发票已存在（ID: {existing.id}）"
            rule.details = {
                "existing_invoice_id": existing.id,
                "is_reimbursed": existing.is_reimbursed
            }
            return rule
        
        rule.is_passed = True
        rule.message = "无重复发票"
        return rule
    
    async def _check_buyer_company(self, invoice: Invoice, db: AsyncSession) -> VerificationRule:
        rule = VerificationRule(
            "buyer_match",
            "抬头一致性校验",
            "company",
            "检查发票抬头与报销单位是否一致"
        )
        
        if not invoice.buyer_name:
            rule.is_passed = True
            rule.message = "购买方名称为空，跳过校验"
            return rule
        
        query = select(Company).where(Company.is_active == True)
        result = await db.execute(query)
        companies = result.scalars().all()
        
        if not companies:
            rule.is_passed = True
            rule.message = "未配置公司信息，跳过校验"
            return rule
        
        buyer_name = invoice.buyer_name.strip()
        
        matched = False
        for company in companies:
            if company.name == buyer_name or buyer_name in company.name or company.name in buyer_name:
                matched = True
                rule.details = {
                    "matched_company": company.name,
                    "company_tax_id": company.tax_id
                }
                break
        
        if not matched:
            rule.is_passed = False
            rule.message = f"发票抬头 '{buyer_name}' 与报销单位不一致"
            rule.details = {
                "buyer_name": buyer_name,
                "configured_companies": [c.name for c in companies]
            }
            return rule
        
        rule.is_passed = True
        rule.message = f"抬头与 '{rule.details.get('matched_company')}' 匹配"
        return rule
    
    def _check_tax_id_format(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "tax_id_format",
            "纳税人识别号校验",
            "format",
            "校验纳税人识别号格式是否正确"
        )
        
        seller_tax_id = (invoice.seller_tax_id or "").strip()
        buyer_tax_id = (invoice.buyer_tax_id or "").strip()
        
        issues = []
        
        if seller_tax_id:
            if not re.match(r'^[A-Z0-9]{15,20}$', seller_tax_id):
                issues.append(f"销售方税号格式异常: {seller_tax_id}")
        
        if buyer_tax_id:
            if not re.match(r'^[A-Z0-9]{15,20}$', buyer_tax_id):
                issues.append(f"购买方税号格式异常: {buyer_tax_id}")
        
        if issues:
            rule.is_passed = False
            rule.message = "; ".join(issues)
            return rule
        
        rule.is_passed = True
        rule.message = "纳税人识别号格式正确"
        return rule
    
    def _check_seal(self, invoice: Invoice) -> VerificationRule:
        rule = VerificationRule(
            "seal_check",
            "发票章校验",
            "seal",
            "检查是否有销售方发票专用章"
        )
        
        if invoice.seller_seal:
            rule.is_passed = True
            rule.message = "检测到销售方发票章"
            return rule
        else:
            rule.is_passed = False
            rule.message = "未检测到销售方发票章（建议确认）"
            rule.details = {"suggestion": "请检查发票是否加盖销售方发票专用章"}
            return rule

class APIVerificationEngine(BaseVerificationEngine):
    async def verify(self, invoice: Invoice, db: AsyncSession) -> Tuple[bool, List[VerificationRule]]:
        rules = []
        
        if not settings.VERIFICATION_API_ENABLED:
            rule = VerificationRule(
                "api_verify",
                "发票真伪API校验",
                "api",
                "通过官方API校验发票真伪"
            )
            rule.is_passed = True
            rule.message = "API校验已禁用，跳过"
            rules.append(rule)
            return True, rules
        
        rule = VerificationRule(
            "api_verify",
            "发票真伪API校验",
            "api",
            "通过官方API校验发票真伪"
        )
        
        try:
            import httpx
            
            api_url = settings.VERIFICATION_API_URL
            params = {
                "invoice_code": invoice.invoice_code,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "total_amount": float(invoice.total_amount) if invoice.total_amount else None
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(api_url, json=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("valid", False):
                        rule.is_passed = True
                        rule.message = "发票真伪校验通过"
                        rule.details = data
                    else:
                        rule.is_passed = False
                        rule.message = data.get("message", "发票真伪校验失败")
                        rule.details = data
                else:
                    rule.is_passed = True
                    rule.message = f"API调用失败，跳过校验 (状态码: {response.status_code})"
                    
        except Exception as e:
            rule.is_passed = True
            rule.message = f"API校验异常，跳过校验: {str(e)}"
        
        rules.append(rule)
        return rule.is_passed, rules

class FullVerificationEngine(BaseVerificationEngine):
    def __init__(self):
        self.tax_engine = TaxVerificationEngine()
        self.api_engine = APIVerificationEngine()
    
    async def verify(self, invoice: Invoice, db: AsyncSession) -> Tuple[bool, List[VerificationRule]]:
        all_rules = []
        
        _, tax_rules = await self.tax_engine.verify(invoice, db)
        all_rules.extend(tax_rules)
        
        _, api_rules = await self.api_engine.verify(invoice, db)
        all_rules.extend(api_rules)
        
        all_passed = all(rule.is_passed for rule in all_rules if rule.rule_type not in ["seal"])
        
        return all_passed, all_rules

def get_verification_engine() -> BaseVerificationEngine:
    return FullVerificationEngine()

verification_engine = get_verification_engine()
