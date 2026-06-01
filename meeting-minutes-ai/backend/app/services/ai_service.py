import httpx
import json
import re
import logging
from typing import Dict, Any, List, Optional
from ..config import settings

logger = logging.getLogger(__name__)


class AIService:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.ARK_API_KEY
        self.base_url = base_url or settings.ARK_BASE_URL
        self.model = model or settings.ARK_MODEL
        logger.info(
            f"AIService initialized: model={self.model}, base_url={self.base_url}"
        )

    async def _call_api(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        logger.info(f"Calling AI API: {url}, model={self.model}")

        if not self.api_key:
            logger.error("API Key is empty!")
            raise ValueError("API Key 未配置，请在设置页面配置火山大模型 API Key")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.debug(f"Request payload: messages={len(messages)} items")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                logger.info(f"API Response status: {response.status_code}")

                if response.status_code != 200:
                    error_text = response.text[:500]
                    logger.error(f"API Error {response.status_code}: {error_text}")
                    raise Exception(
                        f"API 调用失败 (HTTP {response.status_code}): {error_text}"
                    )

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                logger.info(f"API Response received, content length: {len(content)}")
                return content
        except httpx.TimeoutException:
            logger.error("API request timeout")
            raise Exception("API 请求超时，请稍后重试")
        except httpx.ConnectError as e:
            logger.error(f"API connection error: {e}")
            raise Exception(f"无法连接到 API 服务: {e}")
        except Exception as e:
            logger.error(f"Unexpected error calling API: {e}")
            raise

    async def test_connection(self) -> Dict[str, Any]:
        logger.info("Testing AI API connection...")

        if not self.api_key:
            logger.warning("API Key is empty")
            return {
                "success": False,
                "message": "API Key 不能为空，请在设置页面配置",
            }

        try:
            result = await self._call_api(
                [
                    {
                        "role": "user",
                        "content": "请回复一句话：连接成功",
                    }
                ],
                max_tokens=50,
            )
            logger.info(f"Connection test successful: {result[:50]}")
            return {
                "success": True,
                "message": result or "连接成功",
            }
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP 错误 {e.response.status_code}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": f"{error_msg}: 请检查 API Key 和模型端点是否正确",
            }
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "success": False,
                "message": str(e),
            }

    async def transcribe_with_llm(self, text: str) -> str:
        logger.info(f"Transcribing text with LLM, length: {len(text)}")

        if not text.strip():
            logger.warning("Empty text provided for transcription")
            return ""

        messages = [
            {
                "role": "system",
                "content": "你是一个专业的会议记录转写助手。请将以下会议语音识别的原始文本进行优化和整理，确保语句通顺、去除重复、修正明显的语音识别错误，同时保持会议的原意和所有关键信息。不要添加任何解释性文字，只返回整理后的文本。",
            },
            {
                "role": "user",
                "content": f"请整理以下会议录音转写文本：\n\n{text}",
            },
        ]

        try:
            result = await self._call_api(messages, temperature=0.3)
            logger.info(f"Transcription completed, output length: {len(result)}")
            return result
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise

    async def generate_summary(self, transcription: str) -> Dict[str, Any]:
        logger.info(f"Generating summary, input length: {len(transcription)}")

        if not transcription.strip():
            logger.warning("Empty transcription for summary generation")
            return {
                "topic": "会议记录",
                "summary": "会议内容为空",
                "decisions": [],
                "action_items": [],
            }

        system_prompt = """你是一个专业的会议记录总结助手。请分析会议内容，提取关键信息并以严格的 JSON 格式返回。

请返回以下 JSON 结构：
{
    "topic": "会议主题（1句话，不超过50字）",
    "summary": "会议整体总结（200字以内，涵盖核心内容）",
    "decisions": ["决策1", "决策2", ...],
    "action_items": [
        {
            "task": "具体任务内容",
            "assignee": "负责人姓名（如@张三），如果未指定则为null",
            "deadline": "截止时间（如：本周五、下周一下午3点等），如果未指定则为null",
            "priority": "high/medium/low"
        }
    ]
}

规则：
1. decisions 数组：提取会议中明确做出的决定
2. action_items：提取所有待办事项，特别是包含 @负责人 和截止时间的内容
3. 如果信息不明确，对应字段设为 null
4. 严格返回 JSON，不要添加任何解释性文字、不要用 markdown 代码块包裹"""

        messages = [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": f"请分析以下会议内容并返回结构化 JSON：\n\n{transcription}",
            },
        ]

        try:
            result = await self._call_api(messages, temperature=0.1)
            logger.info(f"Summary generated, raw output length: {len(result)}")
            logger.debug(f"Raw output: {result[:200]}")

            try:
                json_match = re.search(r"\{[\s\S]*\}", result)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    logger.info(f"Parsed JSON successfully: topic={parsed.get('topic')}, decisions={len(parsed.get('decisions', []))}, action_items={len(parsed.get('action_items', []))}")
                    return {
                        "topic": parsed.get("topic", "未识别主题"),
                        "summary": parsed.get("summary", transcription[:200]),
                        "decisions": parsed.get("decisions", []),
                        "action_items": parsed.get("action_items", []),
                    }
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error: {e}")
                logger.error(f"Raw output was: {result}")

            logger.warning("Could not parse JSON, returning default structure")
            return {
                "topic": "会议记录",
                "summary": transcription[:500],
                "decisions": [],
                "action_items": [],
            }
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            raise
