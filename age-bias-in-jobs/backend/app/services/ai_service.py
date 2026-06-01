import requests
import json
from typing import Tuple, Optional


class AIService:
    def __init__(self):
        self.default_endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    
    def generate_suggestion(
        self,
        age: int,
        industry: str,
        position: str,
        years_of_experience: int,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.7
    ) -> Tuple[Optional[str], Optional[str]]:
        
        if not api_key:
            return None, "请提供火山引擎API Key"
        
        if not model_name:
            return None, "请提供模型名称"
        
        prompt = f"""
请为一位{age}岁，在{industry}行业工作了{years_of_experience}年的{position}人员，
提供应对职场年龄危机的个性化建议。

请从以下几个方面给出具体、可操作的建议：

1. 🌟 职业发展路径建议（结合{industry}行业特点）
2. 💪 技能升级与转型方向
3. 📝 简历优化与面试技巧
4. 🤝 人脉建设与个人品牌
5. 💰 财务规划与被动收入
6. 😊 心态调整与生活平衡

要求：
- 语气积极、专业、鼓励
- 建议具体可操作，有实际案例或数据支撑
- 结合{industry}行业的特殊性
- 针对{age}岁这个年龄段的痛点给出方案
- 使用Markdown格式，分点清晰，有醒目的emoji标题
"""
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "max_tokens": 4000
        }
        
        try:
            response = requests.post(self.default_endpoint, headers=headers, json=payload, timeout=180)
            
            if response.status_code == 200:
                result = response.json()
                choices = result.get('choices', [])
                if choices and len(choices) > 0:
                    content = choices[0].get('message', {}).get('content', '')
                    if content:
                        return content, None
                    else:
                        return None, "API返回内容为空"
                else:
                    return None, "API返回格式异常，没有choices字段"
            else:
                error_msg = f"API调用失败，状态码: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f"\n错误详情: {json.dumps(error_detail, ensure_ascii=False, indent=2)}"
                except:
                    error_msg += f"\n响应内容: {response.text}"
                return None, error_msg
                
        except requests.exceptions.Timeout:
            return None, "请求超时（超过3分钟），请检查网络连接、API Key或稍后重试"
        except requests.exceptions.ConnectionError:
            return None, "连接错误，请检查网络连接或防火墙设置"
        except Exception as e:
            return None, f"请求异常: {str(e)}"
    
    def test_connection(
        self,
        api_key: str,
        model_name: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        if not api_key:
            return False, "请提供API Key"
        
        if not model_name:
            return False, "请提供模型名称"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": "你好，请用一句话介绍你自己。"
                }
            ],
            "max_tokens": 100
        }
        
        try:
            response = requests.post(self.default_endpoint, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                choices = result.get('choices', [])
                if choices and len(choices) > 0:
                    content = choices[0].get('message', {}).get('content', '')
                    return True, content
                else:
                    return False, "API返回格式异常"
            else:
                error_msg = f"状态码: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f", {json.dumps(error_detail, ensure_ascii=False)}"
                except:
                    error_msg += f", 响应: {response.text}"
                return False, error_msg
                
        except Exception as e:
            return False, str(e)
