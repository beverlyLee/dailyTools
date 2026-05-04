import csv
import io
from typing import List, Optional
from .base import BaseBillParser, BillData
import re


class AlipayBillParser(BaseBillParser):
    ALIPAY_KEYWORDS = ['支付宝', '付款时间', '商品说明', '交易分类', '收付款方式']
    
    ALIPAY_FIELD_MAPPING = {
        '交易时间': 'date',
        '付款时间': 'date',
        '交易分类': 'category',
        '交易对方': 'counterparty',
        '对方账号': 'counterparty_account',
        '商品说明': 'description',
        '收/支': 'income_expense',
        '金额': 'amount',
        '收付款方式': 'payment_method',
        '交易状态': 'status',
        '交易订单号': 'transaction_id',
        '商家订单号': 'merchant_id',
        '备注': 'remark',
    }

    def can_parse(self, content: str) -> bool:
        content_lower = content.lower()
        for keyword in self.ALIPAY_KEYWORDS:
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
                return i
            
            if '付款时间' in stripped and '金额' in stripped:
                return i
            
            if stripped.startswith('交易时间,'):
                return i
            
            if stripped.startswith('付款时间,'):
                return i
        
        return None

    def _parse_row(self, row: dict) -> Optional[BillData]:
        if not row:
            return None
        
        actual_keys = [k for k in row.keys() if k.strip()]
        if not actual_keys:
            return None
        
        date_value = self._get_value(row, ['交易时间', '付款时间', '时间', '日期'])
        if not date_value:
            return None
        
        status = self._get_value(row, ['交易状态', '状态'])
        if status and status in ['交易关闭', '已关闭', '关闭', '退款成功']:
            return None
        
        description = self._get_value(row, ['商品说明', '商品', '描述', '交易对方', '交易分类'])
        amount_str = self._get_value(row, ['金额', '交易金额', '金额(元)'])
        income_expense = self._get_value(row, ['收/支', '收支类型', '类型'])
        category = self._get_value(row, ['交易分类', '分类'])
        
        amount = self.parse_amount(amount_str)
        if amount <= 0:
            return None
        
        normalized_date = self.normalize_date(date_value)
        
        bill_type = self._detect_alipay_type(income_expense, description)
        
        if category in ['', '-', '/', '其他']:
            category = self._infer_category_from_description(description)
        
        full_description = self._build_description(row)
        
        return BillData(
            date=normalized_date,
            description=full_description,
            amount=amount,
            bill_type=bill_type,
            category=category if category else "其他",
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

    def _detect_alipay_type(self, income_expense: str, description: str) -> str:
        if income_expense:
            income_expense = income_expense.strip()
            if income_expense in ['收入', '收', '+']:
                return "income"
            if income_expense in ['支出', '支', '-']:
                return "expense"
        
        return self.detect_type(description)

    def _infer_category_from_description(self, description: str) -> str:
        if not description:
            return "其他"
        
        category_keywords = {
            '餐饮': ['餐饮', '美食', '餐厅', '饭店', '外卖', '饿了么', '美团', '肯德基', '麦当劳', '星巴克', '咖啡', '奶茶', '便利店', '超市'],
            '购物': ['购物', '商城', '淘宝', '天猫', '京东', '拼多多', '网购', '电商', '服饰', '化妆品'],
            '交通': ['交通', '出行', '滴滴', '打车', '出租车', '地铁', '公交', '共享单车', '火车', '机票', '加油', '停车'],
            '娱乐': ['娱乐', '游戏', '电影', '演出', '旅游', '酒店', '住宿', 'KTV', '酒吧'],
            '居住': ['居住', '房租', '水电', '燃气', '物业费', '家居', '装修'],
            '医疗': ['医疗', '医院', '药店', '药品', '体检', '挂号'],
            '教育': ['教育', '培训', '课程', '图书', '书店', '学费'],
        }
        
        desc_lower = description.lower()
        
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in desc_lower:
                    return category
        
        return "其他"

    def _build_description(self, row: dict) -> str:
        parts = []
        
        trade_category = self._get_value(row, ['交易分类', '分类'])
        counterparty = self._get_value(row, ['交易对方', '对方'])
        product = self._get_value(row, ['商品说明', '商品', '商品名称'])
        remark = self._get_value(row, ['备注', '说明'])
        
        if trade_category and trade_category not in ['-', '/', '其他']:
            parts.append(f"[{trade_category}]")
        if counterparty and counterparty not in ['-', '/', '']:
            parts.append(counterparty)
        if product and product not in ['-', '/', '']:
            parts.append(product)
        if remark and remark not in ['-', '/', '']:
            parts.append(f"(备注: {remark})")
        
        if not parts:
            return "支付宝交易"
        
        return ' '.join(parts)
