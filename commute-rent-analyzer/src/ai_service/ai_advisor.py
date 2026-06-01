import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
from typing import List, Dict
from config import Config


class AIAssistant:
    def __init__(self):
        self.api_key = Config.VOLCENGINE_API_KEY
        self.model_id = Config.VOLCENGINE_MODEL_ID
        self.max_retries = 3
        self.timeout = 25

    def call_volcengine_api(self, prompt: str) -> str:
        if self.api_key and self.api_key != 'your_volcengine_api_key_here':
            result = self._real_api_call_with_retry(prompt)
            if result["success"]:
                return result["content"]
            print(f"火山大模型调用提示: {result['message']}")
        return self._generate_mock_recommendation(prompt)

    def _real_api_call_with_retry(self, prompt: str) -> Dict:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        data = {
            "model": self.model_id or "ep-20241225123456",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 1500
        }

        session = requests.Session()
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)

        for attempt in range(self.max_retries):
            try:
                response = session.post(url, headers=headers, json=data, timeout=self.timeout)
                if response.status_code == 200:
                    return {
                        "success": True,
                        "content": response.json()["choices"][0]["message"]["content"],
                        "message": "调用成功"
                    }
                elif response.status_code == 401:
                    return {
                        "success": False,
                        "content": None,
                        "message": "API密钥无效，请检查配置"
                    }
                elif response.status_code == 429:
                    if attempt < self.max_retries - 1:
                        continue
                    return {
                        "success": False,
                        "content": None,
                        "message": "请求频率超限，请稍后重试"
                    }
                else:
                    return {
                        "success": False,
                        "content": None,
                        "message": f"API返回错误: {response.status_code}"
                    }
            except requests.exceptions.Timeout:
                if attempt < self.max_retries - 1:
                    continue
                return {
                    "success": False,
                    "content": None,
                    "message": "请求超时，网络连接不稳定"
                }
            except requests.exceptions.ConnectionError:
                if attempt < self.max_retries - 1:
                    continue
                return {
                    "success": False,
                    "content": None,
                    "message": "无法连接到火山引擎服务"
                }
            except Exception as e:
                return {
                    "success": False,
                    "content": None,
                    "message": f"调用异常: {str(e)}"
                }
        
        return {
            "success": False,
            "content": None,
            "message": f"重试{self.max_retries}次后仍失败"
        }

    def _generate_mock_recommendation(self, prompt: str) -> str:
        import random
        
        areas = [
            {"name": "回龙观", "district": "昌平区", "rent": 4200, "commute": 45},
            {"name": "西二旗", "district": "海淀区", "rent": 5800, "commute": 25},
            {"name": "亦庄", "district": "大兴区", "rent": 4000, "commute": 40},
            {"name": "望京", "district": "朝阳区", "rent": 6500, "commute": 30},
            {"name": "天通苑", "district": "昌平区", "rent": 3800, "commute": 50},
        ]
        
        budget = 5000
        if '5000' in prompt:
            budget = 5000
        elif '3000' in prompt:
            budget = 3000
        elif '8000' in prompt:
            budget = 8000
        
        affordable = [a for a in areas if a["rent"] <= budget * 1.2]
        
        top3 = sorted(affordable, key=lambda x: x["commute"])[:3]
        
        pref_text = ""
        if "地铁" in prompt or "地铁站" in prompt:
            pref_text = "\n🚇 **关于您的地铁需求**：\n回龙观站（13号线）、西二旗站（13号线/昌平线）都是换乘大站，早晚高峰人流较大但班次密集。"
        elif "超市" in prompt or "配套" in prompt:
            pref_text = "\n🛒 **关于您的生活配套需求**：\n以上推荐区域都有大型连锁超市（如华联、永辉），菜市场、餐饮、银行等生活设施完善。"
        elif "安静" in prompt:
            pref_text = "\n🌳 **关于您的居住环境需求**：\n推荐选择小区中心位置或高楼层，避开主干道，可有效降低噪音干扰。"
        
        areas_detail = ""
        for i, area in enumerate(top3, 1):
            tips = [
                f"推荐指数: {'⭐' * (6 - i)}",
                f"租金约 {area['rent']} 元/月，在预算范围内" if area['rent'] <= budget else f"租金约 {area['rent']} 元/月，略超预算",
                f"通勤时间约 {area['commute']} 分钟"
            ]
            areas_detail += f"\n{i}. **{area['name']}** ({area['district']})\n   - " + "\n   - ".join(tips) + "\n"

        return f"""
🏠 **AI 租房顾问推荐报告**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **您的需求分析**
- 预算：约 {budget} 元/月
- 目标城市：北京
- 符合预算区域：{len(affordable)} 个

{pref_text}

🎯 **TOP 3 推荐区域**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{areas_detail}

💡 **决策建议**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **预算优先**：选择 {top3[-1]['name'] if len(top3) > 1 else top3[0]['name']}，租金相对最低，每月可节省约 {budget - min(a['rent'] for a in top3)} 元。

2. **时间优先**：选择 {top3[0]['name']}，通勤时间最短，每天可节省约 {max(a['commute'] for a in top3) - top3[0]['commute']} 分钟。

3. **综合平衡**：推荐 {top3[1]['name'] if len(top3) > 1 else top3[0]['name']}，在租金和通勤之间取得较好平衡。

⚠️ **租房注意事项**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. **实地考察**：建议工作日早高峰时段实地考察通勤时间
2. **合同条款**：仔细阅读租赁合同，注意违约责任和退租条款
3. **设施检查**：检查水电暖气、家电家具等是否完好
4. **周边环境**：晚上考察小区周边治安和噪音情况
5. **中介费**：正规中介一般收取1个月租金作为中介费

📌 **特别提示**
当前北京租房市场特点：
- 毕业季（6-8月）租金可能上涨 5%-15%
- 地铁沿线房源抢手，建议提前看房锁定
- 整租比合租性价比更高，但押金压力大

祝您找到理想的居所！🎊
"""

    def generate_recommendation(
        self,
        city: str,
        budget: float,
        preferences: str,
        areas_data: List[Dict]
    ) -> str:
        if not areas_data:
            return "暂无可用数据，请稍后重试。"

        top_areas = sorted(areas_data, key=lambda x: x["pressure_index"])[:3]
        
        areas_info = []
        for area in top_areas:
            areas_info.append(
                f"- {area['name']} ({area['district']})："
                f"租金{area['rent_median']}元/月，"
                f"通勤{area['commute_minutes']}分钟，"
                f"生存压力指数{area['pressure_index']}"
            )
        
        city_name = Config.CITIES.get(city, {}).get('name', city)
        
        prompt = f"""
作为专业租房顾问，请根据以下信息为用户生成个性化租房建议：

城市：{city_name}
预算：{budget}元/月
用户偏好：{preferences if preferences else '无特殊偏好'}

推荐区域信息：
{chr(10).join(areas_info)}

请生成详细、友好且专业的中文租房建议，包含：
1. 各区域的优缺点分析
2. 适合人群分析
3. 成本分析（租金+通勤成本）
4. 实用的租房小贴士
5. 风险提示

使用markdown格式，适当使用emoji增加可读性。
"""
        
        return self.call_volcengine_api(prompt)


if __name__ == "__main__":
    advisor = AIAssistant()
    result = advisor.generate_recommendation(
        city="beijing",
        budget=5000,
        preferences="希望离地铁站近，生活方便",
        areas_data=[]
    )
    print(result)
