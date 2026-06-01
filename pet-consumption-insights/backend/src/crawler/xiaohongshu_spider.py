import os
import requests
from typing import List, Dict

class XiaohongshuSpider:
    def __init__(self):
        self.api_key = os.getenv('XIAOHONGSHU_API_KEY', '')
        self.api_url = os.getenv('XIAOHONGSHU_API_URL', '')
        
        self.brand_keywords = {
            'food': [
                '渴望', '爱肯拿', '百利', '纽翠斯', 'SC', '巅峰', 'K9',
                '麦富迪', '伯纳天纯', '比乐', '卫仕', '网易严选', '高爷家',
                '诚实一口', '蓝氏', '法米娜', 'NOW', 'GO', '素力高'
            ],
            'medical': [
                '大宠爱', '海乐妙', '拜宠清', '福来恩', '犬心保',
                '维克', '迈瑞', '硕腾', '勃林格', '默沙东'
            ],
            'supplies': [
                'pidan', '小佩', '霍曼', '鸟语花香', '宠幸',
                '猫砂', '猫爬架', '猫包', '狗窝', '牵引绳'
            ]
        }
        
        self.mock_notes = [
            {
                'id': '1',
                'title': '我家猫主子的猫粮分享',
                'content': '一直给我家布偶喂渴望鸡，最近尝试了诚实一口，性价比还不错！',
                'likes': 1234,
                'category': 'food',
                'brands': ['渴望', '诚实一口']
            },
            {
                'id': '2',
                'title': '国产猫粮崛起！麦富迪yyds',
                'content': '之前一直买进口粮，最近试了麦富迪，猫猫很爱吃，支持国货！',
                'likes': 2345,
                'category': 'food',
                'brands': ['麦富迪']
            },
            {
                'id': '3',
                'title': '伯纳天纯冻干猫粮测评',
                'content': '伯纳天纯这款冻干粮真的不错，我家狗狗超爱吃，毛发也变好了~',
                'likes': 1876,
                'category': 'food',
                'brands': ['伯纳天纯']
            },
            {
                'id': '4',
                'title': '猫咪驱虫攻略分享',
                'content': '一直用大宠爱外驱+海乐妙内驱，分享一下驱虫时间表~',
                'likes': 3210,
                'category': 'medical',
                'brands': ['大宠爱', '海乐妙']
            },
            {
                'id': '5',
                'title': 'pidan猫砂真的太好用了',
                'content': '换了好几种猫砂，还是pidan的豆腐猫砂最好用，结团快不粘底！',
                'likes': 2100,
                'category': 'supplies',
                'brands': ['pidan']
            },
            {
                'id': '6',
                'title': '高爷家猫粮真实体验',
                'content': '高爷家这款益生菌猫粮真的绝了，软便克星！国产粮越来越棒了',
                'likes': 1567,
                'category': 'food',
                'brands': ['高爷家']
            },
            {
                'id': '7',
                'title': '小佩智能喂食器体验',
                'content': '入手了小佩的智能喂食器，出门旅游再也不用担心主子饿肚子啦',
                'likes': 987,
                'category': 'supplies',
                'brands': ['小佩']
            },
            {
                'id': '8',
                'title': '百利高蛋白猫粮反馈',
                'content': '百利高蛋白真的长肉神器，我家橘猫一个月胖了两斤！',
                'likes': 2234,
                'category': 'food',
                'brands': ['百利']
            },
            {
                'id': '9',
                'title': '卫仕保健品分享',
                'content': '一直在给我家狗狗吃卫仕的卵磷脂和钙片，毛发亮身体棒~',
                'likes': 1432,
                'category': 'medical',
                'brands': ['卫仕']
            },
            {
                'id': '10',
                'title': '蓝氏猎鸟乳鸽猫粮评测',
                'content': '蓝氏这款猫粮真的惊艳到我了，含肉量超高，猫咪爱吃',
                'likes': 1890,
                'category': 'food',
                'brands': ['蓝氏']
            }
        ]
    
    def extract_brands(self, content: str) -> List[str]:
        found_brands = []
        all_brands = []
        for category_brands in self.brand_keywords.values():
            all_brands.extend(category_brands)
        
        for brand in all_brands:
            if brand in content:
                found_brands.append(brand)
        
        return found_brands
    
    def categorize_note(self, content: str, brands: List[str]) -> str:
        for brand in brands:
            for category, brand_list in self.brand_keywords.items():
                if brand in brand_list:
                    return category
        
        food_keywords = ['粮', '猫粮', '狗粮', '主食', '冻干', '罐头']
        medical_keywords = ['驱虫', '药', '医院', '体检', '疫苗']
        supplies_keywords = ['猫砂', '窝', '笼', '玩具', '碗', '牵引']
        
        for kw in food_keywords:
            if kw in content:
                return 'food'
        for kw in medical_keywords:
            if kw in content:
                return 'medical'
        for kw in supplies_keywords:
            if kw in content:
                return 'supplies'
        
        return 'other'
    
    def fetch_pet_notes(self, keyword: str = '宠物') -> List[Dict]:
        if self.api_key and self.api_url:
            try:
                headers = {'Authorization': f'Bearer {self.api_key}'}
                params = {'keyword': keyword, 'limit': 50}
                response = requests.get(self.api_url, headers=headers, params=params)
                if response.status_code == 200:
                    data = response.json()
                    notes = []
                    for item in data.get('items', []):
                        brands = self.extract_brands(item.get('content', ''))
                        category = self.categorize_note(item.get('content', ''), brands)
                        notes.append({
                            'id': item.get('id'),
                            'title': item.get('title'),
                            'content': item.get('content'),
                            'likes': item.get('likes', 0),
                            'category': category,
                            'brands': brands
                        })
                    return notes
            except Exception as e:
                print(f"API request failed: {e}")
        
        return self.mock_notes
