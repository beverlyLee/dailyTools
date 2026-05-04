import httpx
from typing import Optional, List, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        if self.provider == "volcengine":
            self.api_key = settings.VOLCENGINE_API_KEY
            self.endpoint_id = settings.VOLCENGINE_ENDPOINT_ID
            self.base_url = "https://ark.cn-beijing.volces.com/api/v3"
        elif self.provider == "ollama":
            self.base_url = settings.OLLAMA_BASE_URL
            self.model = settings.OLLAMA_MODEL
        else:
            raise ValueError(f"不支持的LLM提供者: {self.provider}")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        """
        生成对话响应
        
        Args:
            prompt: 用户输入
            system_prompt: 系统提示词（NPC角色设定）
            conversation_history: 对话历史
            temperature: 温度参数
            max_tokens: 最大生成token数
        
        Returns:
            生成的响应文本
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        if conversation_history:
            messages.extend(conversation_history)
        
        messages.append({"role": "user", "content": prompt})
        
        if self.provider == "volcengine":
            return await self._call_volcengine(messages, temperature, max_tokens)
        elif self.provider == "ollama":
            return await self._call_ollama(messages, temperature, max_tokens)
        else:
            raise ValueError(f"不支持的LLM提供者: {self.provider}")

    async def _call_volcengine(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> str:
        """调用火山引擎豆包模型"""
        url = f"{self.base_url}/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.endpoint_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        logger.info(f"调用火山引擎模型: {self.endpoint_id}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"火山引擎API调用失败: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if "choices" not in result or len(result["choices"]) == 0:
                raise Exception(f"火山引擎响应格式错误: {result}")
            
            return result["choices"][0]["message"]["content"]

    async def _call_ollama(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int
    ) -> str:
        """调用本地Ollama模型"""
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
            "stream": False
        }
        
        logger.info(f"调用Ollama模型: {self.model}")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Ollama API调用失败: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if "message" not in result:
                raise Exception(f"Ollama响应格式错误: {result}")
            
            return result["message"]["content"]

    async def check_health(self) -> Dict[str, Any]:
        """检查LLM服务健康状态"""
        try:
            if self.provider == "ollama":
                # 检查Ollama服务
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(f"{self.base_url}/api/tags")
                    if response.status_code == 200:
                        models = response.json().get("models", [])
                        return {
                            "status": "healthy",
                            "provider": self.provider,
                            "model": self.model,
                            "available_models": [m["name"] for m in models]
                        }
            elif self.provider == "volcengine":
                # 检查火山引擎API
                return {
                    "status": "healthy",
                    "provider": self.provider,
                    "endpoint": self.endpoint_id
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": self.provider,
                "error": str(e)
            }
        
        return {
            "status": "unknown",
            "provider": self.provider
        }
