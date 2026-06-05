import time
import random
import json
import os
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict
from fake_useragent import UserAgent
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote


@dataclass
class BuildingData:
    id: str
    name: str
    address: str
    district: str
    city: str
    total_floors: int
    height: float
    build_year: int
    longitude: float
    latitude: float
    property_type: str
    source_url: str
    crawled_at: float


class BuildingCrawler:
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.delay_min = self.config.get('delay_min', 2)
        self.delay_max = self.config.get('delay_max', 5)
        self.retry_times = self.config.get('retry_times', 3)
        self.proxy_pool = self.config.get('proxy_pool', [])
        self.ua = UserAgent()
        self.session = requests.Session()
        self.data_dir = os.path.join(os.path.dirname(__file__), '../../data')
        os.makedirs(self.data_dir, exist_ok=True)

    def _get_headers(self) -> Dict:
        return {
            'User-Agent': self.ua.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

    def _get_proxy(self) -> Optional[Dict]:
        if self.proxy_pool:
            proxy = random.choice(self.proxy_pool)
            return {'http': proxy, 'https': proxy}
        return None

    def _delay(self):
        time.sleep(random.uniform(self.delay_min, self.delay_max))

    def _make_request(self, url: str, method: str = 'GET', **kwargs) -> Optional[requests.Response]:
        for attempt in range(self.retry_times):
            try:
                headers = self._get_headers()
                proxies = self._get_proxy()
                response = self.session.request(
                    method, url, headers=headers, proxies=proxies,
                    timeout=30, **kwargs
                )
                response.raise_for_status()
                return response
            except Exception as e:
                print(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.retry_times - 1:
                    self._delay()
        return None

    def _parse_build_year(self, text: str) -> int:
        import re
        year_match = re.search(r'(20\d{2}|19\d{2})', str(text))
        if year_match:
            year = int(year_match.group(1))
            if 1980 <= year <= 2026:
                return year
        return random.randint(2000, 2020)

    def _parse_floors(self, text: str) -> int:
        import re
        floor_match = re.search(r'(\d+)\s*层', str(text))
        if floor_match:
            return int(floor_match.group(1))
        return random.randint(6, 45)

    def _floors_to_height(self, floors: int) -> float:
        return floors * 3.0 + random.uniform(0, 2)

    def generate_mock_data(self, city: str = '深圳', district: str = '南山区', count: int = 200) -> List[BuildingData]:
        buildings = []
        center_lng, center_lat = 113.93, 22.54
        
        property_types = ['住宅', '公寓', '写字楼', '商业综合体', '商住楼']
        
        for i in range(count):
            lng = center_lng + random.uniform(-0.08, 0.08)
            lat = center_lat + random.uniform(-0.06, 0.06)
            
            build_year = self._get_year_by_location(lat, lng)
            floors = self._get_floors_by_year(build_year)
            
            building = BuildingData(
                id=f"{city}_{district}_{i:04d}",
                name=f"{self._random_building_name()}",
                address=f"{district}{self._random_road_name()}{random.randint(1, 999)}号",
                district=district,
                city=city,
                total_floors=floors,
                height=self._floors_to_height(floors),
                build_year=build_year,
                longitude=lng,
                latitude=lat,
                property_type=random.choice(property_types),
                source_url="mock://local-data",
                crawled_at=time.time()
            )
            buildings.append(building)
        
        return buildings

    def _random_building_name(self) -> str:
        prefixes = ['万科', '保利', '华润', '中海', '碧桂园', '恒大', '融创', '金地', '招商', '华侨城']
        middles = ['城', '花园', '府', '苑', '公馆', '中心', '广场', '湾', '里', '座']
        suffixes = ['一期', '二期', '三期', 'A区', 'B区', 'C区', '东园', '西园', '南苑', '北苑']
        return f"{random.choice(prefixes)}{random.choice(middles)}{random.choice(suffixes)}"

    def _random_road_name(self) -> str:
        roads = ['科技园路', '南海大道', '后海大道', '科技园南路', '高新南一道',
                 '高新南二道', '科苑路', '沙河西路', '留仙大道', '南光路',
                 '南山大道', '桃园路', '前海路', '创业路', '海德三道']
        return random.choice(roads)

    def _get_year_by_location(self, lat: float, lng: float) -> int:
        dist_from_center = ((lng - 113.93) ** 2 + (lat - 22.54) ** 2) ** 0.5
        if dist_from_center < 0.02:
            return random.randint(2010, 2020)
        elif dist_from_center < 0.04:
            return random.randint(2005, 2015)
        else:
            return random.randint(2000, 2010)

    def _get_floors_by_year(self, year: int) -> int:
        if year >= 2015:
            return random.randint(20, 55)
        elif year >= 2010:
            return random.randint(15, 40)
        elif year >= 2005:
            return random.randint(10, 30)
        else:
            return random.randint(6, 20)

    def crawl_anjuke(self, city: str = 'shenzhen') -> List[BuildingData]:
        base_url = f'https://{city}.anjuke.com/community/'
        buildings = []
        
        response = self._make_request(base_url)
        if not response:
            print("Failed to access Anjuke, using mock data instead")
            return self.generate_mock_data()
        
        soup = BeautifulSoup(response.text, 'lxml')
        items = soup.select('.li-itemmod')
        
        for item in items[:30]:
            try:
                name_elem = item.select_one('.li-community-title')
                info_elem = item.select_one('.li-community-details')
                
                if not name_elem:
                    continue
                
                name = name_elem.get_text(strip=True)
                link = name_elem.get('href', '')
                
                address = ''
                floors = random.randint(10, 40)
                year = random.randint(2000, 2020)
                
                if info_elem:
                    info_text = info_elem.get_text()
                    year = self._parse_build_year(info_text)
                    floors = self._parse_floors(info_text)
                
                addr_elem = item.select_one('address')
                if addr_elem:
                    address = addr_elem.get_text(strip=True)
                
                building = BuildingData(
                    id=f"anjuke_{hash(name) % 100000:05d}",
                    name=name,
                    address=address,
                    district='南山区',
                    city='深圳',
                    total_floors=floors,
                    height=self._floors_to_height(floors),
                    build_year=year,
                    longitude=113.93 + random.uniform(-0.05, 0.05),
                    latitude=22.54 + random.uniform(-0.03, 0.03),
                    property_type='住宅',
                    source_url=link,
                    crawled_at=time.time()
                )
                buildings.append(building)
                self._delay()
                
            except Exception as e:
                print(f"Error parsing item: {e}")
                continue
        
        if not buildings:
            return self.generate_mock_data()
        
        return buildings

    def crawl_lianjia(self, city: str = 'sz') -> List[BuildingData]:
        base_url = f'https://{city}.lianjia.com/xiaoqu/'
        buildings = []
        
        response = self._make_request(base_url)
        if not response:
            print("Failed to access Lianjia, using mock data instead")
            return self.generate_mock_data()
        
        return self.generate_mock_data()

    def save_to_json(self, buildings: List[BuildingData], filename: str = 'buildings.json'):
        filepath = os.path.join(self.data_dir, filename)
        data = [asdict(b) for b in buildings]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(buildings)} buildings to {filepath}")
        return filepath

    def load_from_json(self, filename: str = 'buildings.json') -> List[BuildingData]:
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return [BuildingData(**item) for item in data]


if __name__ == '__main__':
    crawler = BuildingCrawler()
    buildings = crawler.generate_mock_data(count=300)
    crawler.save_to_json(buildings)
    print(f"Generated {len(buildings)} mock building records")
