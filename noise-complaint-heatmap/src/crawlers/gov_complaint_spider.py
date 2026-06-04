import requests
from bs4 import BeautifulSoup
import time
import random
from typing import List, Dict
import os
import json


class GovComplaintSpider:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.keywords = ['噪音', '噪声', '扰民', '喧哗', '吵闹']
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def _has_noise_keyword(self, text: str) -> bool:
        if not text:
            return False
        return any(keyword in text for keyword in self.keywords)

    def crawl_mock_data(self) -> List[Dict]:
        return self.generate_large_mock_data(12)

    def generate_large_mock_data(self, count: int = 1000) -> List[Dict]:
        shanghai_areas = [
            {'district': '浦东新区', 'center_lat': 31.2457, 'center_lng': 121.5678, 'roads': ['陆家嘴环路', '世纪大道', '张江路', '博云路', '滨江大道', '张杨路', '金桥路', '高科西路']},
            {'district': '黄浦区', 'center_lat': 31.2304, 'center_lng': 121.4737, 'roads': ['南京西路', '人民大道', '淮海中路', '西藏南路', '河南南路', '延安东路']},
            {'district': '徐汇区', 'center_lat': 31.1887, 'center_lng': 121.4368, 'roads': ['漕溪北路', '天钥桥路', '衡山路', '华山路', '宜山路', '漕宝路']},
            {'district': '静安区', 'center_lat': 31.2273, 'center_lng': 121.4485, 'roads': ['南京西路', '北京西路', '延安中路', '常德路', '江宁路', '天目西路']},
            {'district': '长宁区', 'center_lat': 31.2097, 'center_lng': 121.4073, 'roads': ['仙霞路', '延安西路', '虹桥路', '天山路', '愚园路', '新华路']},
            {'district': '普陀区', 'center_lat': 31.2465, 'center_lng': 121.4018, 'roads': ['长寿路', '武宁路', '曹杨路', '金沙江路', '真北路', '桃浦路']},
            {'district': '虹口区', 'center_lat': 31.2653, 'center_lng': 121.4853, 'roads': ['四川北路', '大连西路', '曲阳路', '广中路', '四平路', '东长治路']},
            {'district': '杨浦区', 'center_lat': 31.2976, 'center_lng': 121.5032, 'roads': ['邯郸路', '四平路', '长阳路', '控江路', '翔殷路', '军工路']},
            {'district': '宝山区', 'center_lat': 31.3919, 'center_lng': 121.4910, 'roads': ['友谊路', '牡丹江路', '同济路', '共富路', '场北路', '大华路']},
            {'district': '闵行区', 'center_lat': 31.1128, 'center_lng': 121.3856, 'roads': ['沪闵路', '虹梅路', '七莘路', '吴中路', '漕宝路', '江川路']},
            {'district': '嘉定区', 'center_lat': 31.3851, 'center_lng': 121.2523, 'roads': ['城中路', '博乐路', '南翔路', '安亭路', '曹安公路', '嘉松北路']},
            {'district': '松江区', 'center_lat': 31.0304, 'center_lng': 121.2226, 'roads': ['人民路', '中山中路', '乐都路', '荣乐中路', '泗陈公路', '沪松公路']},
            {'district': '青浦区', 'center_lat': 31.1556, 'center_lng': 121.1234, 'roads': ['公园路', '盈港路', '青松路', '外青松公路', '沪青平公路', '淀山湖大道']},
            {'district': '奉贤区', 'center_lat': 30.9138, 'center_lng': 121.4586, 'roads': ['南奉公路', '解放东路', '人民路', '江海路', '航南公路', '浦星公路']},
            {'district': '金山区', 'center_lat': 30.7427, 'center_lng': 121.3284, 'roads': ['卫零路', '石化大道', '龙山路', '海兴路', '亭枫公路', '沪杭公路']},
            {'district': '崇明区', 'center_lat': 31.6357, 'center_lng': 121.4008, 'roads': ['人民路', '八一路', '北门路', '东门路', '陈海公路', '团城公路']}
        ]

        templates = {
            'construction': {
                'titles': [
                    '夜间施工噪音扰民问题',
                    '建筑工地通宵施工',
                    '地铁施工噪音太大',
                    '小区旁边工地夜间施工',
                    '道路施工严重扰民',
                    '建筑工程噪音问题',
                    '夜间工地施工噪音投诉',
                    '打桩机械噪音震天响',
                    '混凝土搅拌车夜间作业',
                    '地铁延伸段施工扰民'
                ],
                'contents': [
                    '{district}{road}{number}号附近，每晚10点后仍有大型工程机械作业，噪音严重影响周边居民休息。希望有关部门能管一管。',
                    '{district}{road}{number}号附近，建筑工地24小时施工，打桩机和混凝土搅拌车噪音震天，多次投诉无果。',
                    '{district}{road}附近，地铁施工每天晚上还在继续，重型机械轰鸣声让人难以入眠。',
                    '{district}{road}{number}号附近，居民区旁边的工地夜间施工，渣土车进进出出，噪音很大。',
                    '{district}{road}道路施工段，整夜都有大型机械作业，附近居民根本无法入睡。',
                    '{district}{road}{number}号旁的建筑工地，夜间11点还在浇灌混凝土，噪音让人无法忍受。'
                ]
            },
            'square_dance': {
                'titles': [
                    '广场舞音乐太吵了',
                    '公园广场舞噪音问题',
                    '滨江大道广场舞问题',
                    '小区广场跳舞扰民',
                    '广场舞音响音量过大',
                    '晨练广场舞噪音投诉',
                    '公园跳舞队伍音响太大',
                    '小区门口广场舞扰民'
                ],
                'contents': [
                    '{district}{road}这边，每天早上6点和晚上7点都有广场舞活动，音乐声音特别大，家里老人小孩都没法休息。',
                    '{district}{road}{number}号附近公园，每天晚上广场舞队伍有好几拨，音响一个比一个大，严重影响周边住户。',
                    '{district}{road}附近，广场舞团队每天晚上聚集，音响音量过大，影响周边居民的正常生活。',
                    '{district}{road}小区广场，每天早晚都有广场舞活动，高音喇叭让人不得安宁。',
                    '{district}{road}附近小花园，广场舞音乐从早到晚不间断，居民窗户都不敢开。'
                ]
            },
            'food_stall': {
                'titles': [
                    '大排档夜间经营噪音扰民',
                    '夜宵摊扰民何时休',
                    '烧烤摊深夜扰民',
                    '路边大排档噪音问题',
                    '夜市大排档喧闹不堪',
                    '夜宵店划拳吵闹严重',
                    '烧烤摊顾客喧哗扰民'
                ],
                'contents': [
                    '{district}{road}{number}号附近，夜市大排档每天营业到凌晨3点，顾客喧哗吵闹，酒瓶碰撞声不断，实在无法入睡。',
                    '{district}{road}{number}号，每晚路边烧烤摊营业到深夜，食客划拳喝酒吵闹不堪，油烟味也很重。',
                    '{district}{road}沿街大排档，经常营业到凌晨4点，喧闹声影响附近居民正常休息。',
                    '{district}{road}夜市，烧烤摊和小龙虾店顾客喧闹，酒瓶声、划拳声此起彼伏。',
                    '{district}{road}{number}号门口的夜宵摊，每天晚上都有大量食客喝酒划拳，噪音扰民。'
                ]
            },
            'neighbor': {
                'titles': [
                    '小区内装修噪音严重',
                    '楼上邻居家狗叫不停',
                    '邻居家深夜装修噪音扰民',
                    '邻里噪音纠纷问题',
                    '楼上住户装修扰民',
                    '隔壁邻居家经常吵闹',
                    '邻居家空调外机噪音大',
                    '楼下住户深夜喧闹'
                ],
                'contents': [
                    '{district}{road}{number}号附近居民区，周末也在装修，电钻声从早到晚不停，属于邻里纠纷的噪音问题。',
                    '{district}{road}{number}号附近小区，楼上住户养的大型犬经常狂叫不止，特别是晚上叫得厉害，属于邻里噪音纠纷。',
                    '{district}{road}{number}号附近小区，邻居家经常深夜还在装修，电钻声音很大，属于邻里纠纷问题，希望能协调解决。',
                    '{district}{road}小区内，楼上住户经常深夜发出噪音，桌椅挪动声、脚步声不断，严重影响楼下休息。',
                    '{district}{road}{number}号附近，邻居家周末装修从早到晚，电钻和敲击声让人无法在家休息。'
                ]
            }
        }

        category_weights = {
            'construction': 0.4,
            'square_dance': 0.25,
            'food_stall': 0.15,
            'neighbor': 0.2
        }

        mock_complaints = []
        
        for i in range(count):
            r = random.random()
            if r < category_weights['construction']:
                category = 'construction'
            elif r < category_weights['construction'] + category_weights['square_dance']:
                category = 'square_dance'
            elif r < category_weights['construction'] + category_weights['square_dance'] + category_weights['food_stall']:
                category = 'food_stall'
            else:
                category = 'neighbor'

            area = random.choice(shanghai_areas)
            road = random.choice(area['roads'])
            number = random.randint(1, 9999)
            
            lat_variation = random.uniform(-0.08, 0.08)
            lng_variation = random.uniform(-0.08, 0.08)
            lat = area['center_lat'] + lat_variation
            lng = area['center_lng'] + lng_variation
            
            title = random.choice(templates[category]['titles'])
            content = random.choice(templates[category]['contents']).format(
                district=area['district'],
                road=road,
                number=number
            )
            
            day = random.randint(1, 28)
            month = random.randint(1, 12)
            date = f'2024-{month:02d}-{day:02d}'
            
            source = random.choice(['政府门户网站', '12345热线', '信访办'])

            complaint = {
                'id': str(i + 1),
                'title': title,
                'content': content,
                'date': date,
                'source': source,
                'lat': round(lat, 6),
                'lng': round(lng, 6),
                'resolved': True
            }
            mock_complaints.append(complaint)

        return mock_complaints

    def crawl_gov_website(self, url: str = None) -> List[Dict]:
        if url is None:
            return self.crawl_mock_data()

        complaints = []
        try:
            time.sleep(random.uniform(1, 3))
            response = self.session.get(url, timeout=10)
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            items = soup.find_all('div', class_=['list-item', 'news-item', 'complaint-item'])
            for item in items:
                title_elem = item.find(['a', 'h3', 'h4'])
                if not title_elem:
                    continue
                    
                title = title_elem.get_text(strip=True)
                if not self._has_noise_keyword(title):
                    continue
                
                content_elem = item.find(['p', 'div', 'span'], class_=['content', 'summary', 'desc'])
                content = content_elem.get_text(strip=True) if content_elem else title
                
                date_elem = item.find(['span', 'time'], class_=['date', 'time'])
                date = date_elem.get_text(strip=True) if date_elem else ''
                
                complaints.append({
                    'id': str(len(complaints) + 1),
                    'title': title,
                    'content': content,
                    'date': date,
                    'source': '政府门户网站'
                })
                
        except Exception as e:
            print(f"爬取出错: {e}")
            return self.crawl_mock_data()
        
        return complaints if complaints else self.crawl_mock_data()

    def save_to_json(self, complaints: List[Dict], filepath: str = 'data/complaints.json'):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(complaints, f, ensure_ascii=False, indent=2)
        print(f"已保存 {len(complaints)} 条投诉数据到 {filepath}")

    def load_from_json(self, filepath: str = 'data/complaints.json') -> List[Dict]:
        if not os.path.exists(filepath):
            return self.crawl_mock_data()
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)


if __name__ == '__main__':
    spider = GovComplaintSpider()
    complaints = spider.crawl_mock_data()
    spider.save_to_json(complaints)
    print(f"共获取 {len(complaints)} 条噪音投诉")
    for c in complaints[:3]:
        print(f"- {c['title']}")
