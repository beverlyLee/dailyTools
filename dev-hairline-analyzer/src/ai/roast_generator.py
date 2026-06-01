import os
import requests
from dotenv import load_dotenv
from typing import Dict, Optional

load_dotenv()

class RoastGenerator:
    """AI劝退文案生成器 - 调用火山引擎Ark大模型生成毒舌但幽默的劝退指南"""
    
    def __init__(self):
        self.api_key = os.getenv('ARK_API_KEY', '').strip()
        self.endpoint = 'https://ark.cn-beijing.volces.com/api/v3/responses'
        self.model = 'doubao-seed-1-8-251228'
        self.use_mock = not bool(self.api_key)
        
        print(f"[AI初始化] API密钥状态: {'已配置' if self.api_key else '未配置（使用Mock）'}")
        print(f"[AI初始化] 使用模型: {self.model}")
        print(f"[AI初始化] API端点: {self.endpoint}")
    
    def generate_dissuasion(self, language: str, risk_score: float) -> str:
        """
        生成针对指定编程语言的劝退文案
        
        Args:
            language: 编程语言名称
            risk_score: 发际线风险分数
            
        Returns:
            生成的劝退文案
        """
        if self.use_mock:
            print(f"[AI生成] 使用Mock数据: {language}")
            return self._get_mock_dissuasion(language, risk_score)
        
        print(f"[AI生成] 调用火山引擎API: {language} (风险: {risk_score}%)")
        return self._call_ark_api(language, risk_score)
    
    def _call_ark_api(self, language: str, risk_score: float) -> str:
        """
        调用火山引擎Ark大模型API（最新Response接口格式）
        
        Args:
            language: 编程语言名称
            risk_score: 发际线风险分数
            
        Returns:
            AI生成的劝退文案
        """
        system_prompt = """
        你是一个毒舌但幽默的程序员劝退师，专门针对各种编程语言编写劝退指南。
        你的风格应该：
        1. 幽默、毒舌但不要人身攻击
        2. 结合程序员脱发、加班、发际线后退等话题
        3. 字数控制在100字左右
        4. 必须包含"入坑需谨慎"这句话
        5. 全程使用中文回复
        """
        
        user_prompt = f"""
        请针对{language}语言生成一段"劝退指南"。
        已知该语言开发者的发际线焦虑提及率为{risk_score}%。
        请根据风险程度调整毒舌程度，风险越高越夸张。
        """
        
        try:
            payload = {
                "model": self.model,
                "input": [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "input_text",
                                "text": system_prompt
                            }
                        ]
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": user_prompt
                            }
                        ]
                    }
                ]
            }
            
            print(f"[AI请求] 发送请求到火山引擎...")
            response = requests.post(
                self.endpoint,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                },
                json=payload,
                timeout=30
            )
            
            print(f"[AI响应] 状态码: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"[AI响应] 响应结构: {list(result.keys())}")
                
                if 'output' in result:
                    # output是一个列表，找到type为message的项
                    for output_item in result['output']:
                        if output_item.get('type') == 'message' and output_item.get('role') == 'assistant':
                            ai_content = output_item['content'][0]['text']
                            print(f"[AI成功] 生成内容长度: {len(ai_content)} 字符")
                            return ai_content
                    
                    # 如果没找到message，尝试第一个item
                    if len(result['output']) > 1:
                        ai_content = result['output'][1]['content'][0]['text']
                        print(f"[AI成功] 生成内容长度: {len(ai_content)} 字符")
                        return ai_content
                elif 'choices' in result:
                    ai_content = result['choices'][0]['message']['content']
                    print(f"[AI成功] 生成内容长度: {len(ai_content)} 字符")
                    return ai_content
                
                print(f"[AI警告] 未知响应格式，回退到Mock")
                return self._get_mock_dissuasion(language, risk_score)
            else:
                print(f"[AI错误] API调用失败: {response.status_code}")
                print(f"[AI错误] 响应内容: {response.text[:500]}")
                return self._get_mock_dissuasion(language, risk_score)
                
        except requests.exceptions.Timeout:
            print(f"[AI错误] 请求超时")
            return self._get_mock_dissuasion(language, risk_score)
        except requests.exceptions.RequestException as e:
            print(f"[AI错误] 网络请求异常: {str(e)}")
            return self._get_mock_dissuasion(language, risk_score)
        except Exception as e:
            print(f"[AI错误] 未知异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._get_mock_dissuasion(language, risk_score)
    
    def _get_mock_dissuasion(self, language: str, risk_score: float) -> str:
        """
        获取预设的Mock劝退文案（当API密钥未配置或调用失败时使用）
        
        Args:
            language: 编程语言名称
            risk_score: 发际线风险分数
            
        Returns:
            Mock劝退文案
        """
        mock_roasts = {
            'Java': f"""⚠️ Java劝退指南 ⚠️

发际线风险指数：{risk_score}%

同学，入坑Java需谨慎！每天对着十几层抽象的Spring，
不仅脑子要秃，头发也跟着跑路。
当你还在配置XML的时候，同龄人已经带着植发钱去写Go了。
珍爱生命，远离Java！""",

            'PHP': f"""⚠️ PHP劝退指南 ⚠️

发际线风险指数：{risk_score}%

PHP是最好的语言——但你的头发不是！
当你还在祖传代码里挣扎时，发际线已经退到后脑勺了。
入坑需谨慎，珍爱头发，远离PHP！
毕竟，不是每个程序员都能成为"地中海"程序员的。""",

            'Go': f"""⚠️ Go劝退指南 ⚠️

发际线风险指数：{risk_score}%

Go虽然简洁，但你的发际线可不简单！
天天写if err != nil，写着写着就把头发写成了nil。
入坑需谨慎，写Go前请先囤好几瓶生发水，
不然你的头发可能就跟Goroutine一样，跑着跑着就没了。""",

            'Python': f"""⚠️ Python劝退指南 ⚠️

发际线风险指数：{risk_score}%

Python虽好，可不要贪多哦！
当你还在调包的时候，头发已经悄悄离开了你。
记住：import this，但不要import脱发！
入坑需谨慎，写Python一时爽，发际线火葬场。""",

            'JavaScript': f"""⚠️ JavaScript劝退指南 ⚠️

发际线风险指数：{risk_score}%

JS生态更新太快，头发跟不上节奏！
刚学会React又出Vue3，刚搞懂Vite又出来Bun...
入坑需谨慎，你的发际线经不起这么折腾！
等你学会所有框架时，头发可能已经跟callback一样了。"""
        }
        
        default_roast = f"""⚠️ {language}劝退指南 ⚠️

发际线风险指数：{risk_score}%

亲爱的程序员同学，入坑需谨慎！
选择{language}意味着你将踏上一条充满挑战的路，
而你的发际线，可能会在这条路上渐行渐远...
珍爱头发，慎重选语言！"""
        
        return mock_roasts.get(language, default_roast)
    
    def set_api_key(self, api_key: str):
        """
        动态设置API密钥
        
        Args:
            api_key: 火山引擎API密钥
        """
        self.api_key = api_key.strip()
        self.use_mock = not bool(self.api_key)
        print(f"[AI配置] API密钥已更新，状态: {'启用真实AI' if self.api_key else '使用Mock'}")
