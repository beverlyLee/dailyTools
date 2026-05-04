from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from datetime import datetime


class TemplateService:
    def __init__(self, templates_dir: Optional[Path] = None):
        if templates_dir is None:
            from ..config import settings
            templates_dir = settings.TEMPLATES_DIR
        
        self.templates_dir = templates_dir
        self.env = Environment(
            loader=FileSystemLoader(str(templates_dir)),
            autoescape=select_autoescape(['html', 'xml', 'txt'])
        )
        
        self._register_filters()

    def _register_filters(self):
        self.env.filters['format_date'] = self._format_date
        self.env.filters['format_money'] = self._format_money
        self.env.filters['format_percent'] = self._format_percent

    def _format_date(self, date_val: Any, format_str: str = "%Y年%m月%d日") -> str:
        if isinstance(date_val, str):
            try:
                date_val = datetime.fromisoformat(date_val)
            except ValueError:
                return date_val
        if isinstance(date_val, datetime):
            return date_val.strftime(format_str)
        return str(date_val)

    def _format_money(self, amount: Any, currency: str = "人民币") -> str:
        try:
            num = float(amount)
            formatted = "{:,.2f}".format(num)
            return f"{currency} {formatted} 元"
        except (ValueError, TypeError):
            return str(amount)

    def _format_percent(self, value: Any, decimal_places: int = 2) -> str:
        try:
            num = float(value)
            return f"{num * 100:.{decimal_places}}%"
        except (ValueError, TypeError):
            return str(value)

    def generate_document(self, template_name: str, context: Dict[str, Any]) -> str:
        template = self.env.get_template(template_name)
        return template.render(**context)

    def generate_complaint(self, context: Dict[str, Any]) -> str:
        return self.generate_document("complaint_template.jinja2", context)

    def generate_contract(self, context: Dict[str, Any]) -> str:
        return self.generate_document("contract_template.jinja2", context)

    def generate_claim_letter(self, context: Dict[str, Any]) -> str:
        return self.generate_document("claim_letter_template.jinja2", context)

    def generate_power_of_attorney(self, context: Dict[str, Any]) -> str:
        return self.generate_document("power_of_attorney_template.jinja2", context)

    def list_available_templates(self) -> list:
        templates = [
            {
                "name": "民事起诉状",
                "template_file": "complaint_template.jinja2",
                "description": "用于向法院提起民事诉讼的起诉状",
                "category": "诉讼文书"
            },
            {
                "name": "借款合同",
                "template_file": "contract_template.jinja2",
                "description": "用于民间借贷的借款合同模板",
                "category": "合同文书"
            },
            {
                "name": "索赔函",
                "template_file": "claim_letter_template.jinja2",
                "description": "用于向对方主张索赔的正式函件",
                "category": "商务文书"
            },
            {
                "name": "授权委托书",
                "template_file": "power_of_attorney_template.jinja2",
                "description": "用于委托他人代理法律事务的授权书",
                "category": "授权文书"
            }
        ]
        return templates

    def get_template_requirements(self, template_name: str) -> Dict[str, Any]:
        requirements = {
            "complaint_template.jinja2": {
                "required_fields": [
                    "plaintiff_name", "plaintiff_gender", "plaintiff_birth_date",
                    "plaintiff_ethnicity", "plaintiff_occupation", "plaintiff_address",
                    "plaintiff_phone", "defendant_name", "defendant_gender",
                    "defendant_birth_date", "defendant_ethnicity", "defendant_occupation",
                    "defendant_address", "defendant_phone", "cause_of_action",
                    "claims", "facts_and_reasons", "evidence_list", "court_name"
                ],
                "optional_fields": [
                    "plaintiff_agent", "defendant_agent", "filing_date"
                ],
                "example": {
                    "plaintiff_name": "张三",
                    "plaintiff_gender": "男",
                    "plaintiff_birth_date": "1990-01-01",
                    "plaintiff_ethnicity": "汉族",
                    "plaintiff_occupation": "职员",
                    "plaintiff_address": "北京市朝阳区某某路某某号",
                    "plaintiff_phone": "13800138000",
                    "defendant_name": "李四",
                    "defendant_gender": "女",
                    "defendant_birth_date": "1985-05-15",
                    "defendant_ethnicity": "汉族",
                    "defendant_occupation": "个体工商户",
                    "defendant_address": "北京市海淀区某某街某某号",
                    "defendant_phone": "13900139000",
                    "cause_of_action": "民间借贷纠纷",
                    "claims": [
                        "判令被告偿还原告借款本金人民币100,000元",
                        "判令被告支付原告借款利息（以100,000元为基数，自借款之日起至实际清偿之日止，按年利率15.4%计算）",
                        "判令被告承担本案诉讼费用"
                    ],
                    "facts_and_reasons": "原告与被告系朋友关系。2023年1月15日，被告因资金周转需要向原告借款人民币100,000元，并出具借条一张，约定借款期限为6个月，月利率为1.5%。借款到期后，经原告多次催讨，被告均以各种理由拒绝偿还。为维护原告的合法权益，特向贵院提起诉讼，请依法判决。",
                    "evidence_list": [
                        {"name": "借条", "description": "证明被告向原告借款的事实"},
                        {"name": "银行转账记录", "description": "证明原告已实际交付借款"},
                        {"name": "微信聊天记录", "description": "证明原告多次催讨借款的事实"}
                    ],
                    "court_name": "北京市朝阳区人民法院"
                }
            },
            "contract_template.jinja2": {
                "required_fields": [
                    "party_a_name", "party_a_address", "party_a_contact",
                    "party_b_name", "party_b_address", "party_b_contact",
                    "contract_type", "principal_amount", "interest_rate",
                    "borrowing_term", "purpose", "repayment_method"
                ],
                "optional_fields": [
                    "guarantor_name", "guarantor_address", "collateral_description",
                    "signing_date", "signing_place"
                ]
            },
            "claim_letter_template.jinja2": {
                "required_fields": [
                    "claimant_name", "claimant_address", "claimant_contact",
                    "respondent_name", "respondent_address", "respondent_contact",
                    "claim_amount", "claim_reason", "deadline_date"
                ],
                "optional_fields": [
                    "evidence_attachments", "claim_date"
                ]
            },
            "power_of_attorney_template.jinja2": {
                "required_fields": [
                    "principal_name", "principal_gender", "principal_birth_date",
                    "principal_ethnicity", "principal_id_number", "principal_address",
                    "agent_name", "agent_gender", "agent_birth_date",
                    "agent_ethnicity", "agent_id_number", "agent_address",
                    "authorization_purpose", "authorization_scope"
                ],
                "optional_fields": [
                    "authorization_start_date", "authorization_end_date",
                    "issuing_date", "issuing_place"
                ]
            }
        }
        return requirements.get(template_name, {})


template_service = TemplateService()
