from typing import Optional, Tuple
import requests

from app.config import get_settings

class IntentRecognitionService:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.intent_threshold = settings.intent_threshold
    
    def _build_intent_prompt(self, user_input: str) -> str:
        return f"""请分析以下用户问题的意图，并判断是否可以通过产品知识库回答。

用户问题: {user_input}

请按以下格式回答：
意图类型: [product_query / technical_support / complaint / general_chat / out_of_scope]
置信度: [0-1之间的数字]
是否可由知识库回答: [是/否]
简要分析: [一句话说明判断理由]

说明:
- product_query: 用户询问产品功能、使用方法、规格等产品相关问题
- technical_support: 用户遇到技术问题需要帮助解决
- complaint: 用户表达不满或投诉
- general_chat: 用户只是闲聊或问候
- out_of_scope: 问题超出产品知识库范围，需要人工处理
"""
    
    async def analyze_intent(self, user_input: str) -> dict:
        prompt = self._build_intent_prompt(user_input)
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9
                    }
                },
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                text_response = result.get("response", "")
                
                intent_info = self._parse_intent_response(text_response)
                return intent_info
            else:
                return {
                    "intent": "unknown",
                    "confidence": 0.5,
                    "can_answer_with_kb": False,
                    "analysis": "模型调用失败"
                }
                
        except Exception:
            return {
                "intent": "unknown",
                "confidence": 0.5,
                "can_answer_with_kb": False,
                "analysis": "意图分析服务异常"
            }
    
    def _parse_intent_response(self, response_text: str) -> dict:
        intent = "unknown"
        confidence = 0.5
        can_answer_with_kb = False
        analysis = ""
        
        lines = response_text.strip().split("\n")
        
        for line in lines:
            line = line.strip()
            if line.startswith("意图类型:"):
                intent_type = line.split(":", 1)[1].strip().lower()
                if intent_type in ["product_query", "technical_support", "complaint", "general_chat", "out_of_scope"]:
                    intent = intent_type
            elif line.startswith("置信度:"):
                try:
                    conf_str = line.split(":", 1)[1].strip()
                    confidence = float(conf_str)
                except ValueError:
                    confidence = 0.5
            elif line.startswith("是否可由知识库回答:"):
                answer = line.split(":", 1)[1].strip()
                can_answer_with_kb = answer == "是"
            elif line.startswith("简要分析:"):
                analysis = line.split(":", 1)[1].strip()
        
        return {
            "intent": intent,
            "confidence": confidence,
            "can_answer_with_kb": can_answer_with_kb,
            "analysis": analysis
        }
    
    def should_create_ticket(self, intent_info: dict, kb_relevance: float) -> Tuple[bool, str]:
        intent = intent_info.get("intent", "unknown")
        can_answer = intent_info.get("can_answer_with_kb", False)
        confidence = intent_info.get("confidence", 0.5)
        
        if intent == "out_of_scope":
            return True, "问题超出知识库范围"
        
        if intent == "complaint":
            return True, "用户投诉，需要人工处理"
        
        if not can_answer and kb_relevance < self.intent_threshold:
            return True, "知识库中无相关信息"
        
        if intent == "technical_support" and kb_relevance < self.intent_threshold:
            return True, "技术问题无解决方案，需要人工支持"
        
        return False, ""
