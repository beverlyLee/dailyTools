#!/usr/bin/env python3
import csv
import os
import re
from datetime import datetime
from ..nutrition_db.food_matcher import FoodMatcher
from ..nutrition_db.database import save_order

class CSVImporter:
    def __init__(self):
        self.food_matcher = FoodMatcher()
        self.supported_platforms = ['美团', '饿了么', '饿了吗', 'ele.me', 'meituan']
        self.required_columns = ['日期', '商家', '菜品']
        self.optional_columns = ['平台', '总价', '金额', '价格', '实付']
    
    def get_parse_rules(self):
        return """
📋 CSV导入解析规则

🔍 支持的列名:
  必填列:
    • 日期 / 下单时间 / 订单时间 / date
      格式: 2024-01-15, 2024/01/15, 24-01-15
    
    • 商家 / 店铺 / 餐厅 / restaurant / shop
      商家名称
    
    • 菜品 / 商品 / 订单内容 / items / food
      多个菜品用逗号、分号或换行分隔
  
  可选列:
    • 平台 / 来源 / platform / source
    • 总价 / 金额 / 价格 / 实付 / total / price

📝 菜品解析规则:
  • 支持数量标识: 如 "汉堡x2", "炸鸡×3", "可乐*1"
  • 支持中文数量: 如 "米饭2份"
  • 多个菜品用 逗号(,)、分号(;)、竖线(|) 或换行分隔
  
💡 示例格式:
  日期,商家,菜品,总价
  2024-01-15,肯德基,香辣鸡腿堡x1,薯条x1,59.9
  2024-01-16,麦当劳,麦辣鸡腿堡x1;鸡翅x2,45.5
"""
    
    def validate_csv(self, file_path):
        if not os.path.exists(file_path):
            return False, f"文件不存在: {file_path}"
        
        if not file_path.endswith('.csv'):
            return False, "文件格式错误，必须是 .csv 文件"
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames:
                    return False, "CSV文件没有表头"
                
                headers = [h.strip() for h in reader.fieldnames]
                
                has_required = any(
                    req in headers or 
                    req.lower() in [h.lower() for h in headers]
                    for req in ['日期', 'date', '下单时间']
                ) and any(
                    req in headers or 
                    req.lower() in [h.lower() for h in headers]
                    for req in ['商家', '店铺', 'restaurant', 'shop']
                ) and any(
                    req in headers or 
                    req.lower() in [h.lower() for h in headers]
                    for req in ['菜品', '商品', 'items', 'food']
                )
                
                if not has_required:
                    return False, f"""缺少必填列！需要包含：
  • 日期列 (日期、date、下单时间等)
  • 商家列 (商家、店铺、restaurant等)
  • 菜品列 (菜品、商品、items等)

当前表头: {', '.join(headers)}

{self.get_parse_rules()}"""
                
                return True, f"CSV格式验证通过，表头: {', '.join(headers)}"
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    reader = csv.DictReader(f)
                    if reader.fieldnames:
                        return True, "CSV格式验证通过 (GBK编码)"
                    return False, "CSV文件没有表头"
            except Exception as e:
                return False, f"文件编码错误: {str(e)}"
        except Exception as e:
            return False, f"CSV解析错误: {str(e)}"
    
    def parse_csv(self, file_path):
        is_valid, message = self.validate_csv(file_path)
        if not is_valid:
            raise ValueError(message)
        
        orders = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    order = self._parse_order_row(row)
                    if order:
                        orders.append(order)
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='gbk') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    order = self._parse_order_row(row)
                    if order:
                        orders.append(order)
        
        return orders
    
    def _parse_order_row(self, row):
        order_date = self._extract_date(row)
        platform = self._extract_platform(row)
        restaurant = self._extract_restaurant(row)
        total_price = self._extract_price(row)
        items = self._extract_items(row)
        
        if not items:
            return None
        
        matched_items = []
        for item in items:
            result = self.food_matcher.calculate_calories(
                item['name'],
                quantity=item.get('quantity', 1)
            )
            matched_items.append({
                'food_name': result['display_name'],
                'quantity': item.get('quantity', 1),
                'calories': result['total_calories'],
                'protein': result.get('protein', 0),
                'fat': result.get('fat', 0),
                'carbs': result.get('carbs', 0),
                'matched': result['matched']
            })
        
        return {
            'order_date': order_date,
            'platform': platform,
            'restaurant_name': restaurant,
            'total_price': total_price,
            'items': matched_items
        }
    
    def _extract_date(self, row):
        date_fields = ['日期', '下单时间', '订单时间', 'date', 'time', 'order_date']
        for field in date_fields:
            if field in row and row[field]:
                date_str = str(row[field]).strip()
                try:
                    if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
                        return date_str[:10]
                    elif re.match(r'\d{4}/\d{2}/\d{2}', date_str):
                        return date_str.replace('/', '-')[:10]
                    elif re.match(r'\d{2}-\d{2}-\d{2}', date_str):
                        return '20' + date_str.replace('-', '-')[:8]
                except:
                    pass
        
        return datetime.now().strftime('%Y-%m-%d')
    
    def _extract_platform(self, row):
        platform_fields = ['平台', '来源', 'platform', 'source']
        for field in platform_fields:
            if field in row and row[field]:
                return str(row[field]).strip()
        
        return '外卖'
    
    def _extract_restaurant(self, row):
        rest_fields = ['商家', '店铺', '餐厅', 'restaurant', 'shop', 'store']
        for field in rest_fields:
            if field in row and row[field]:
                return str(row[field]).strip()
        
        return '未知商家'
    
    def _extract_price(self, row):
        price_fields = ['总价', '金额', '价格', '实付', 'total', 'price', 'amount']
        for field in price_fields:
            if field in row and row[field]:
                try:
                    price_str = re.sub(r'[^\d.]', '', str(row[field]))
                    return float(price_str)
                except:
                    pass
        
        return 0.0
    
    def _extract_items(self, row):
        items = []
        
        item_fields = ['菜品', '商品', '订单内容', 'items', 'food', 'goods']
        for field in item_fields:
            if field in row and row[field]:
                content = str(row[field]).strip()
                if content:
                    items = self._parse_items_text(content)
                    if items:
                        return items
        
        name_fields = ['名称', '菜名', 'food_name', 'name']
        for field in name_fields:
            if field in row and row[field]:
                items.append({
                    'name': str(row[field]).strip(),
                    'quantity': 1
                })
        
        return items
    
    def _parse_items_text(self, text):
        items = []
        
        separators = [';', '；', ',', '，', '\n', '|']
        for sep in separators:
            if sep in text:
                item_texts = text.split(sep)
                for item_text in item_texts:
                    item_text = item_text.strip()
                    if item_text:
                        quantity_match = re.search(r'[x×*]\s*(\d+)', item_text)
                        quantity = int(quantity_match.group(1)) if quantity_match else 1
                        item_name = re.sub(r'[x×*]\s*\d+', '', item_text).strip()
                        items.append({
                            'name': item_name,
                            'quantity': quantity
                        })
                return items
        
        if text:
            items.append({
                'name': text,
                'quantity': 1
            })
        
        return items
    
    def import_and_save(self, file_path):
        orders = self.parse_csv(file_path)
        saved_count = 0
        
        for order in orders:
            try:
                save_order(
                    order['order_date'],
                    order['platform'],
                    order['restaurant_name'],
                    order['total_price'],
                    order['items']
                )
                saved_count += 1
            except Exception as e:
                print(f"保存订单失败: {e}")
        
        return saved_count, len(orders)

def create_sample_csv(output_path):
    sample_data = [
        {
            '日期': '2024-01-15',
            '平台': '美团',
            '商家': '肯德基',
            '总价': '59.9',
            '菜品': '香辣鸡腿堡x1，薯条x1，可乐x1'
        },
        {
            '日期': '2024-01-16',
            '平台': '饿了么',
            '商家': '麦当劳',
            '总价': '45.5',
            '菜品': '麦辣鸡腿堡x1，鸡翅x2'
        },
        {
            '日期': '2024-01-17',
            '平台': '美团',
            '商家': '川菜馆',
            '总价': '68.0',
            '菜品': '宫保鸡丁x1，米饭x2，麻婆豆腐x1'
        },
        {
            '日期': '2024-01-18',
            '平台': '饿了么',
            '商家': '奶茶店',
            '总价': '28.0',
            '菜品': '珍珠奶茶x2'
        },
        {
            '日期': '2024-01-19',
            '平台': '美团',
            '商家': '炸鸡店',
            '总价': '39.9',
            '菜品': '炸鸡x1，可乐x1'
        },
    ]
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['日期', '平台', '商家', '总价', '菜品'])
        writer.writeheader()
        writer.writerows(sample_data)
    
    return output_path

if __name__ == '__main__':
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'sample_orders.csv')
    create_sample_csv(sample_path)
    print(f"示例CSV已创建: {sample_path}")
    
    importer = CSVImporter()
    saved, total = importer.import_and_save(sample_path)
    print(f"已导入 {saved}/{total} 条订单")
