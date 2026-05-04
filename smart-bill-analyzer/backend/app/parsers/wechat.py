import csv
import io
from typing import List, Optional
from .base import BaseBillParser, BillData
import re


class WechatBillParser(BaseBillParser):
    WECHAT_KEYWORDS = ['微信', '微信支付', '交易时间', '交易类型', '收/支']
    
    WECHAT_FIELD_MAPPING = {
        '交易时间': 'date',
        '交易类型': 'type_indicator',
        '交易对方': 'counterparty',
        '商品': 'description',
        '收/支': 'income_expense',
        '金额(元)': 'amount',
        '支付方式': 'payment_method',
        '当前状态': 'status',
        '交易单号': 'transaction_id',
        '商户单号': 'merchant_id',
        '备注': 'remark',
    }

    def can_parse(self, content: str) -> bool:
        content_lower = content.lower()
        for keyword in self.WECHAT_KEYWORDS:
            if keyword.lower() in content_lower:
                return True
        return False

    def parse(self, content: str) -> List[BillData]:
        bills: List[BillData] = []
        
        lines = content.split('\n')
        data_start_index = self._find_data_start(lines)
        
        if data_start_index is None:
            return bills
        
        csv_content = '\n'.join(lines[data_start_index:])
        
        try:
            reader = csv.DictReader(io.StringIO(csv_content))
            for row in reader:
                bill = self._parse_row(row)
                if bill:
                    bills.append(bill)
        except csv.Error:
            pass
        
        return bills

    def _find_data_start(self, lines: List[str]) -> Optional[int]:
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            
            if '交易时间' in stripped and '金额' in stripped:
                if i > 0 and (
                    '微信' in lines[i-1] or 
                    lines[i-1].strip() == ''
                ):
                    return i
                return i
            
            if stripped.startswith('交易时间,'):
                return i
        
        return None

    def _parse_row(self, row: dict) -> Optional[BillData]:
        if not row:
            return None
        
        actual_keys = [k for k in row.keys() if k.strip()]
        if not actual_keys:
            return None
        
        date_value = self._get_value(row, ['交易时间', '时间', '日期'])
        if not date_value:
            return None
        
        description = self._get_value(row, ['商品', '商品说明', '描述', '交易对方', '交易类型'])
        amount_str = self._get_value(row, ['金额(元)', '金额', '金额元', '交易金额'])
        income_expense = self._get_value(row, ['收/支', '收支类型', '类型'])
        
        amount = self.parse_amount(amount_str)
        if amount <= 0:
            return None
        
        normalized_date = self.normalize_date(date_value)
        
        bill_type = self._detect_wechat_type(income_expense, description)
        
        full_description = self._build_description(row)
        
        return BillData(
            date=normalized_date,
            description=full_description,
            amount=amount,
            bill_type=bill_type,
        )

    def _get_value(self, row: dict, possible_keys: List[str]) -> str:
        for key in possible_keys:
            if key in row:
                value = row.get(key, '')
                if value:
                    return str(value).strip()
            
            for actual_key in row.keys():
                if key in actual_key:
                    value = row.get(actual_key, '')
                    if value:
                        return str(value).strip()
        
        return ''

    def _detect_wechat_type(self, income_expense: str, description: str) -> str:
        if income_expense:
            income_expense = income_expense.strip()
            if income_expense in ['收入', '收', '+']:
                return "income"
            if income_expense in ['支出', '支', '-']:
                return "expense"
        
        return self.detect_type(description)

    def _build_description(self, row: dict) -> str:
        parts = []
        
        trade_type = self._get_value(row, ['交易类型', '类型'])
        counterparty = self._get_value(row, ['交易对方', '对方'])
        product = self._get_value(row, ['商品', '商品说明', '商品名称'])
        remark = self._get_value(row, ['备注', '说明'])
        
        if trade_type:
            parts.append(trade_type)
        if counterparty and counterparty != '/':
            parts.append(f"- {counterparty}")
        if product and product != '/':
            parts.append(product)
        if remark and remark != '/':
            parts.append(f"(备注: {remark})")
        
        if not parts:
            return "微信交易"
        
        return ' '.join(parts)
