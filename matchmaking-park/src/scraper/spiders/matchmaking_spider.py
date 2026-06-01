import scrapy
import random
from datetime import datetime
from src.scraper.items import MatchmakingItem


class MatchmakingSpider(scrapy.Spider):
    name = 'matchmaking'
    allowed_domains = ['example.com']
    
    city_parks = {
        '北京': ['中山公园', '天坛公园', '玉渊潭公园'],
        '上海': ['人民公园', '鲁迅公园', '世纪公园'],
        '深圳': ['莲花山公园', '中心公园'],
        '广州': ['天河公园', '越秀公园'],
        '杭州': ['西湖公园', '黄龙体育中心'],
        '成都': ['人民公园', '新华公园']
    }
    
    def start_requests(self):
        for city, parks in self.city_parks.items():
            for park in parks:
                url = f'https://example.com/matchmaking/{city}/{park}'
                yield scrapy.Request(
                    url=url,
                    callback=self.parse,
                    meta={'city': city, 'park': park}
                )
    
    def parse(self, response):
        city = response.meta['city']
        park = response.meta['park']
        
        mock_data = self.generate_mock_data(city, park)
        
        for item in mock_data:
            yield item
    
    def generate_mock_data(self, city, park):
        items = []
        num_items = random.randint(5, 15)
        
        base_profiles = [
            {'gender': '女', 'age_range': (25, 35), 'height_range': (155, 175)},
            {'gender': '男', 'age_range': (27, 38), 'height_range': (170, 185)}
        ]
        
        educations = ['大专', '本科', '硕士', '博士']
        incomes = ['10万以下', '10-20万', '20-30万', '30-50万', '50万以上']
        
        for i in range(num_items):
            profile = random.choice(base_profiles)
            age = random.randint(*profile['age_range'])
            height = random.randint(*profile['height_range'])
            education = random.choices(educations, weights=[0.1, 0.4, 0.4, 0.1])[0]
            income = random.choice(incomes)
            
            has_hukou = random.random() > 0.3 if city == '北京' else random.random() > 0.6
            has_house = random.random() > 0.4 if city == '上海' else random.random() > 0.5
            
            content = self.generate_content(
                profile['gender'], age, height, education, 
                city, has_hukou, has_house, income
            )
            
            item = MatchmakingItem(
                item_id=f"{city}_{park}_{datetime.now().strftime('%Y%m%d')}_{i}",
                city=city,
                park_name=park,
                image_url=f'https://example.com/images/{city}_{park}_{i}.jpg',
                ocr_raw_text=content,
                ocr_confidence=round(random.uniform(0.7, 0.99), 2),
                parsed_gender=profile['gender'],
                parsed_age=age,
                parsed_height=height,
                parsed_education=education,
                parsed_hukou=has_hukou,
                parsed_house=has_house,
                parsed_income=income,
                parsed_requirements='有稳定工作，性格好',
                crawl_timestamp=datetime.now().isoformat(),
                data_source='park_signboard_ocr'
            )
            items.append(item)
        
        return items
    
    def generate_content(self, gender, age, height, education, city, has_hukou, has_house, income):
        parts = [f"{gender}，{age}岁，{height}cm，{education}"]
        
        if city == '北京' and has_hukou:
            parts.append('京户')
        elif has_hukou:
            parts.append(f'{city}户口')
        
        if has_house:
            parts.append('有房')
        
        parts.append(f'年薪{income}')
        parts.append('寻找年龄相仿的伴侣')
        
        return '，'.join(parts)
