import re
import requests
from typing import Dict, Optional, Tuple
import os
from dotenv import load_dotenv

load_dotenv()


class AddressResolver:
    def __init__(self):
        self.api_key = os.getenv('GAODE_GEOCODE_KEY')
        self.geocode_url = 'https://restapi.amap.com/v3/geocode/geo'
        
        self.address_patterns = [
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5\d]{2,20}路\d*号?)',
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5\d]{2,20}街\d*号?)',
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5\d]{2,20}大道\d*号?)',
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5\d]{2,20}环路\d*号?)',
            r'([\u4e00-\u9fa5]{2,20}路\d*号?附近)',
            r'([\u4e00-\u9fa5]{2,20}街\d*号?附近)',
            r'([\u4e00-\u9fa5]{2,20}大道\d*号?附近)',
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5]{2,10}公园)',
            r'([\u4e00-\u9fa5]{2,10}区[\u4e00-\u9fa5]{2,10}广场)',
            r'([\u4e00-\u9fa5]{2,20}公园附近?)',
            r'([\u4e00-\u9fa5]{2,20}广场附近?)',
        ]
        
        self.mock_coordinates = {
            '浦东新区张江高科技园区博云路2号': {'lat': 31.2099, 'lng': 121.5978},
            '黄浦区人民广场南京西路': {'lat': 31.2324, 'lng': 121.4695},
            '徐汇区天钥桥路333号': {'lat': 31.1887, 'lng': 121.4368},
            '静安区南京西路1266号': {'lat': 31.2273, 'lng': 121.4485},
            '浦东新区陆家嘴环路1000号': {'lat': 31.2387, 'lng': 121.5012},
            '徐汇区漕溪北路451号': {'lat': 31.1851, 'lng': 121.4365},
            '长宁区仙霞路455号': {'lat': 31.2097, 'lng': 121.4073},
            '杨浦区邯郸路220号': {'lat': 31.2976, 'lng': 121.5032},
            '浦东新区世纪大道100号': {'lat': 31.2355, 'lng': 121.5046},
            '静安区南京西路1618号': {'lat': 31.2253, 'lng': 121.4431},
            '闵行区沪闵路6088号': {'lat': 31.1128, 'lng': 121.3856},
            '浦东新区滨江大道2727号': {'lat': 31.2398, 'lng': 121.5035},
        }

    def extract_address(self, text: str) -> Optional[str]:
        if not text:
            return None
            
        for pattern in self.address_patterns:
            matches = re.findall(pattern, text)
            if matches:
                return matches[0]
        
        district_pattern = r'([\u4e00-\u9fa5]{2,10}区)'
        matches = re.findall(district_pattern, text)
        if matches:
            return matches[0]
            
        return None

    def geocode_with_gaode(self, address: str, city: str = '上海') -> Optional[Tuple[float, float]]:
        if not self.api_key:
            return None
            
        try:
            params = {
                'key': self.api_key,
                'address': address,
                'city': city,
                'output': 'json'
            }
            response = requests.get(self.geocode_url, params=params, timeout=5)
            data = response.json()
            
            if data.get('status') == '1' and data.get('geocodes'):
                location = data['geocodes'][0]['location']
                lng, lat = map(float, location.split(','))
                return (lat, lng)
        except Exception as e:
            print(f"地理编码API调用失败: {e}")
        
        return None

    def geocode_with_mock(self, address: str) -> Optional[Tuple[float, float]]:
        if not address:
            return None
            
        for key, coords in self.mock_coordinates.items():
            if key in address or any(part in address for part in key.split('区')[-1:]):
                return (coords['lat'], coords['lng'])
        
        for key, coords in self.mock_coordinates.items():
            key_parts = key.replace('号', '').replace('附近', '')
            if any(part in address for part in key_parts.split('路')[:1]):
                return (coords['lat'], coords['lng'])
        
        return None

    def resolve(self, text: str, use_api: bool = False) -> Dict:
        result = {
            'address': None,
            'lat': None,
            'lng': None,
            'resolved': False
        }
        
        address = self.extract_address(text)
        if not address:
            return result
        
        result['address'] = address
        
        if use_api and self.api_key:
            coords = self.geocode_with_gaode(address)
            if coords:
                result['lat'], result['lng'] = coords
                result['resolved'] = True
                return result
        
        coords = self.geocode_with_mock(address)
        if coords:
            result['lat'], result['lng'] = coords
            result['resolved'] = True
        
        return result

    def batch_resolve(self, complaints: list, use_api: bool = False) -> list:
        resolved = []
        for complaint in complaints:
            addr_result = self.resolve(complaint.get('content', ''), use_api=use_api)
            complaint.update(addr_result)
            resolved.append(complaint)
        return resolved


if __name__ == '__main__':
    resolver = AddressResolver()
    
    test_texts = [
        '浦东新区张江高科技园区博云路2号附近，每晚10点后仍有大型工程机械作业',
        '黄浦区人民广场南京西路这边，每天早上6点和晚上7点都有广场舞活动',
        '徐汇区天钥桥路333号附近，夜市大排档每天营业到凌晨3点'
    ]
    
    for text in test_texts:
        result = resolver.resolve(text)
        print(f"文本: {text[:30]}...")
        print(f"解析结果: {result}\n")
