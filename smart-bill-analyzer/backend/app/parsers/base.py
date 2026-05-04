from abc import ABC, abstractmethod
from typing import List, Dict, Any
import re
from datetime import datetime


class BillData:
    def __init__(
        self,
        date: str,
        description: str,
        amount: float,
        bill_type: str = "expense",
        category: str = "其他"
    ):
        self.date = date
        self.description = description
        self.amount = amount
        self.bill_type = bill_type
        self.category = category

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "description": self.description,
            "amount": self.amount,
            "type": self.bill_type,
            "category": self.category,
        }


class BaseBillParser(ABC):
    @abstractmethod
    def can_parse(self, content: str) -> bool:
        pass

    @abstractmethod
    def parse(self, content: str) -> List[BillData]:
        pass

    @staticmethod
    def normalize_date(date_str: str) -> str:
        patterns = [
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',
            r'(\d{4})-(\d{1,2})-(\d{1,2})',
            r'(\d{4})/(\d{1,2})/(\d{1,2})',
            r'(\d{4})(\d{2})(\d{2})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                year = match.group(1)
                month = match.group(2).zfill(2)
                day = match.group(3).zfill(2)
                return f"{year}-{month}-{day}"
        
        try:
            parsed = datetime.strptime(date_str[:10], "%Y-%m-%d")
            return parsed.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            return date_str

    @staticmethod
    def parse_amount(amount_str: str) -> float:
        if not amount_str:
            return 0.0
        
        cleaned = str(amount_str).strip()
        cleaned = re.sub(r'[¥￥$,\s]', '', cleaned)
        
        if '+' in cleaned:
            cleaned = cleaned.replace('+', '')
        if '-' in cleaned:
            cleaned = cleaned.replace('-', '')
        
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def detect_type(description: str, amount_str: str = "") -> str:
        income_keywords = ['收入', '收款', '退款', '到账', '提现', '转账收入', '红包收入', '工资']
        expense_keywords = ['支出', '消费', '付款', '支付', '扣费', '转账支出', '红包发出', '还款']
        
        desc_lower = description.lower()
        
        for keyword in income_keywords:
            if keyword in desc_lower:
                return "income"
        
        for keyword in expense_keywords:
            if keyword in desc_lower:
                return "expense"
        
        if '+' in str(amount_str):
            return "income"
        if '-' in str(amount_str):
            return "expense"
        
        return "expense"
