import os
import requests
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

class TripPolisher:
    def __init__(self):
        self.api_key = os.getenv('VOLCENGINE_API_KEY', '')
        self.model = os.getenv('VOLCENGINE_MODEL', 'doubao-seed-2-0-code-preview-260215')
        self.endpoint = os.getenv('VOLCENGINE_ENDPOINT', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions')

    def polish_trip(self, city: str, days: int, route_data: Dict) -> Dict:
        prompt = self._build_prompt(city, days, route_data)
        
        try:
            polished_content = self._call_volcengine_api(prompt)
            return {
                'original_route': route_data,
                'polished_content': polished_content,
                'city': city,
                'days': days
            }
        except Exception as e:
            print(f"AI润色失败: {e}")
            return self._fallback_polish(city, days, route_data)

    def _build_prompt(self, city: str, days: int, route_data: Dict) -> str:
        days_plan = route_data.get('days', [])
        route_description = []
        
        for day_plan in days_plan:
            day_num = day_plan['day']
            pois = [p['name'] for p in day_plan['pois']]
            distance = day_plan['total_distance']
            route_description.append(
                f"第{day_num}天：游览{', '.join(pois)}，步行约{distance}米"
            )
        
        prompt = f"""
请将以下{city}{days}天的旅行行程，润写成一篇文艺风格的游记。

行程安排：
{chr(10).join(route_description)}

要求：
1. 使用文艺、诗意的语言
2. 加入适当的情感和场景描写
3. 保持行程的真实性
4. 分段叙述，每天一段
5. 总字数控制在500-800字
6. 给游记起一个优美的标题

请以JSON格式返回，包含以下字段：
- title: 游记标题
- content: 润色后的游记内容（每段用换行分隔）
"""
        return prompt

    def _call_volcengine_api(self, prompt: str) -> Dict:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }
        
        data = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.7,
            'max_tokens': 1000
        }
        
        response = requests.post(self.endpoint, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        import json
        try:
            return json.loads(content)
        except:
            return {
                'title': '旅行游记',
                'content': content
            }

    def _fallback_polish(self, city: str, days: int, route_data: Dict) -> Dict:
        days_plan = route_data.get('days', [])
        paragraphs = []
        
        templates = [
            "清晨的阳光洒落在{city}的街头，我们踏上了前往{poi}的旅程。{poi}的美景如诗如画，让人不禁沉醉其中。",
            "午后的时光总是那么惬意。漫步在{poi}的小径上，感受着历史的气息与现代的活力交织。这里的每一砖每一瓦，都诉说着属于{city}的故事。",
            "夕阳西下，{city}被染上了一层金色的光晕。站在{poi}的高处俯瞰，整座城市的美景尽收眼底，心中满是感动与不舍。",
            "夜幕降临，{city}的夜景格外迷人。{poi}的灯光璀璨夺目，与天上的星星交相辉映，构成了一幅美丽的画卷。"
        ]
        
        for day_idx, day_plan in enumerate(days_plan):
            pois = [p['name'] for p in day_plan['pois']]
            day_content = []
            
            for i, poi in enumerate(pois):
                template = templates[i % len(templates)]
                day_content.append(template.format(city=city, poi=poi))
            
            paragraphs.append(f"【第{day_plan['day']}天】\n" + '\n'.join(day_content))
        
        return {
            'original_route': route_data,
            'polished_content': {
                'title': f'{city}，一场{days}天的美丽邂逅',
                'content': '\n\n'.join(paragraphs)
            },
            'city': city,
            'days': days
        }
