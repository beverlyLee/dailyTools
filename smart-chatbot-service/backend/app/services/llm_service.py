import requests
from typing import List, Optional

class LLMService:
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url
        self.model = model
        self.api_url = f"{base_url}/api/generate"
        self.chat_api_url = f"{base_url}/api/chat"
    
    def _build_system_prompt(self) -> str:
        return """你是一个专业的企业智能客服助手，任务是根据提供的上下文信息和对话历史来回答用户的问题。

请严格遵循以下规则：
1. 首先仔细阅读提供的上下文信息，这是企业内部的产品文档和知识库
2. 只基于上下文中的信息回答问题，不要编造或猜测
3. 如果上下文中没有相关信息，请诚实地表示"根据当前知识库，我无法回答这个问题"
4. 保持回答简洁、专业、友好，避免使用技术术语
5. 参考对话历史，保持回答的连贯性
6. 如果用户问题需要进一步澄清，可以礼貌地询问更多细节

记住：你的目标是帮助用户解决产品使用问题，如果问题超出知识库范围，应该让用户知道需要人工协助。
"""
    
    async def generate(
        self, 
        user_input: str, 
        context: Optional[str] = None, 
        history: Optional[List[dict]] = None
    ) -> str:
        system_prompt = self._build_system_prompt()
        
        messages = []
        messages.append({"role": "system", "content": system_prompt})
        
        if context and context != "没有找到相关的文档信息。":
            context_prompt = f"以下是企业产品知识库中的相关信息：\n{context}\n\n请根据以上信息回答用户的问题。如果信息不足，请明确告知用户。"
            messages.append({"role": "system", "content": context_prompt})
        
        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        
        messages.append({"role": "user", "content": user_input})
        
        try:
            response = requests.post(
                self.chat_api_url,
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("message", {}).get("content", "抱歉，我暂时无法回答您的问题。")
            else:
                return f"调用模型服务失败，状态码: {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            return "无法连接到本地模型服务，请确保Ollama正在运行。"
        except requests.exceptions.Timeout:
            return "模型服务响应超时，请稍后再试。"
        except Exception as e:
            return f"生成回复时发生错误: {str(e)}"
    
    def check_ollama_available(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def list_models(self) -> List[str]:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return [model["name"] for model in models]
            return []
        except:
            return []
