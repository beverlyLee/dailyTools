import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()


class AIGuide:
    def __init__(self):
        self.api_key = os.getenv('ARK_API_KEY')
        self.base_url = os.getenv('ARK_API_URL', 'https://ark.cn-beijing.volces.com/api/v3/responses')
        self.model = os.getenv('ARK_MODEL', 'doubao-seed-2-0-lite-260428')
        self.last_error = None

    def test_api_connection(self):
        if not self.api_key:
            return False, "未配置ARK_API_KEY"
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }

        data = {
            'model': self.model,
            'stream': False,
            'input': [
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'input_text',
                            'text': '你好，请回复"API连接成功"'
                        }
                    ]
                }
            ]
        }

        try:
            print(f"测试API连接: {self.base_url}")
            print(f"使用模型: {self.model}")
            response = requests.post(self.base_url, headers=headers, json=data, timeout=15)
            print(f"响应状态码: {response.status_code}")
            response.raise_for_status()
            result = response.json()
            print(f"API响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            content = result.get('output', {}).get('content', [{}])[0].get('text', '连接成功但响应格式异常')
            return True, content
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP错误 {e.response.status_code}: {e.response.text}"
            print(f"API连接失败: {error_msg}")
            self.last_error = error_msg
            return False, error_msg
        except Exception as e:
            error_msg = f"连接失败: {str(e)}"
            print(f"API连接失败: {error_msg}")
            self.last_error = error_msg
            return False, error_msg

    def call_volcengine(self, prompt):
        if not self.api_key:
            self.last_error = "未配置ARK_API_KEY"
            return self._get_mock_recommendation(prompt)

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_key}'
        }

        data = {
            'model': self.model,
            'stream': False,
            'input': [
                {
                    'role': 'system',
                    'content': [
                        {
                            'type': 'input_text',
                            'text': '你是一个专业的旅游向导，擅长根据天气数据和游客流量数据推荐最佳游览时间和路线。请用中文回答，格式清晰，使用emoji增加可读性。'
                        }
                    ]
                },
                {
                    'role': 'user',
                    'content': [
                        {
                            'type': 'input_text',
                            'text': prompt
                        }
                    ]
                }
            ]
        }

        try:
            response = requests.post(self.base_url, headers=headers, json=data, timeout=60)
            response.raise_for_status()
            result = response.json()
            content = result.get('output', {}).get('content', [{}])[0].get('text')
            if not content:
                raise ValueError("响应中未找到内容字段")
            return content
        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP错误 {e.response.status_code}: {e.response.text}"
            print(f"API调用失败: {error_msg}")
            self.last_error = error_msg
            return self._get_mock_recommendation(prompt)
        except Exception as e:
            error_msg = f"调用失败: {str(e)}"
            print(f"API调用失败: {error_msg}")
            self.last_error = error_msg
            return self._get_mock_recommendation(prompt)

    def get_last_error(self):
        return self.last_error

    def _get_mock_recommendation(self, prompt):
        if '黄山' in prompt:
            return """
🏔️ **黄山风景区最佳游览推荐**

📅 **最佳游览月份推荐：**

🥇 **9月 - 金秋时节**
   - 天气：平均气温18-24°C，降水少，晴天多
   - 优势：云海概率高，秋景迷人，游客相对较少
   - 推荐指数：⭐⭐⭐⭐⭐

🥈 **4月 - 春暖花开**
   - 天气：平均气温12-20°C，春雨绵绵但不影响观景
   - 优势：山花烂漫，绿意盎然，是摄影的好时节
   - 推荐指数：⭐⭐⭐⭐

🥉 **10月下旬 - 秋意正浓**
   - 天气：平均气温15-22°C，天气晴朗
   - 优势：红叶满山，色彩斑斓，避开国庆高峰
   - 推荐指数：⭐⭐⭐⭐

🚶 **推荐游览路线（避开拥堵）：**

**路线一：后山云谷寺上山（经典路线）**
   - 云谷寺 → 白鹅岭 → 始信峰 → 北海景区 → 光明顶
   - 优势：此路线游客相对较少，登山难度适中

**路线二：避开玉屏楼拥堵时段**
   - 建议早上7:00前或下午16:00后游览迎客松
   - 避开10:00-15:00的高峰时段

**路线三：西海大峡谷反向游览**
   - 从排云亭进入，二环处折返
   - 避开大量团队游客的正向游览路线

⚠️ **注意事项：**
   - 6-8月为梅雨和暑期旺季，雨水多且游客量大，建议避开
   - 1-2月虽有雪景，但天气寒冷，需做好保暖
   - 建议提前查看天气预报，选择连续晴天游览
            """
        else:
            return """
🌄 **旅游推荐**

📅 **最佳游览月份：**
   - 春季（4-5月）：气候宜人，风景优美
   - 秋季（9-10月）：天高气爽，游客适中
   - 避开雨季和节假日高峰期

🚶 **推荐路线：**
   - 建议从景区后门进入，避开正门人流
   - 选择非周末时段游览
   - 提前预订门票和住宿
            """

    def recommend_best_time(self, location, analysis_data):
        prompt = f"""
请根据以下数据分析，为{location}推荐最佳游览月份和路线：

游客流量与天气数据：
{analysis_data.to_string(index=False)}

请提供：
1. 排名前三的最佳游览月份及理由
2. 推荐的游览路线，帮助游客避开拥堵
3. 注意事项和实用建议
4. 天气因素对游览体验的影响

请用中文回答，格式清晰，使用emoji增加可读性。
        """

        return self.call_volcengine(prompt)

    def generate_custom_route(self, location, days, preferences):
        prompt = f"""
请为{location}设计一个{days}天的旅游路线，考虑以下偏好：
{preferences}

请考虑：
1. 天气因素，避免雨天集中的时间段
2. 游客流量，避开热门景点的高峰时段
3. 合理的行程安排，劳逸结合
4. 推荐的交通方式和住宿建议

请用中文回答，格式清晰，使用emoji增加可读性。
        """

        return self.call_volcengine(prompt)
