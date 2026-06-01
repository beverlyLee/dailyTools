import json
import httpx
from typing import Optional, Dict
from app.config import settings


FALL_KEYWORDS = ['跌倒', '摔倒', '倒地', '砰', '咚', '哎呀', '救命', '痛', '疼', '帮帮我']
CRY_KEYWORDS = ['哭', '哭泣', '呜呜', '抽泣']
SCREAM_KEYWORDS = ['尖叫', '呼救', 'help', '救命', '紧急']


class SoundDetector:
    def __init__(self):
        self.api_key = settings.ARK_API_KEY
        self.base_url = settings.ARK_BASE_URL
        self.model = settings.ARK_MODEL
    
    def _use_keyword_detection(self, audio_transcript: str) -> Dict:
        transcript_lower = audio_transcript.lower()
        
        for keyword in SCREAM_KEYWORDS:
            if keyword.lower() in transcript_lower:
                return {'sound_type': 'scream', 'confidence': 0.85, 'reason': f'检测到关键词: {keyword}'}
        
        for keyword in FALL_KEYWORDS:
            if keyword.lower() in transcript_lower:
                return {'sound_type': 'fall', 'confidence': 0.8, 'reason': f'检测到关键词: {keyword}'}
        
        for keyword in CRY_KEYWORDS:
            if keyword.lower() in transcript_lower:
                return {'sound_type': 'cry', 'confidence': 0.7, 'reason': f'检测到关键词: {keyword}'}
        
        return {'sound_type': 'unknown', 'confidence': 0.3, 'reason': '未检测到异常关键词'}
    
    async def detect_with_llm(self, audio_transcript: str) -> Dict:
        if not self.api_key:
            return self._use_keyword_detection(audio_transcript)
        
        prompt = f"""你是一个独居老人声音异常检测系统。分析以下音频转写内容，判断是否包含异常声音事件。

音频转写内容:
"{audio_transcript}"

请判断是否属于以下类别之一:
1. fall - 跌倒/摔倒相关的声音或呼救
2. scream - 紧急呼救/尖叫声
3. cry - 哭泣声
4. unknown - 正常声音或无法判断

请以 JSON 格式返回:
{{
    "sound_type": "fall|scream|cry|unknown",
    "confidence": 0.0-1.0,
    "reason": "简短说明"
}}

只返回 JSON，不要其他文字。"""
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3
                    }
                )
                
                if response.status_code == 200:
                    content = response.json()['choices'][0]['message']['content']
                    content = content.strip()
                    if content.startswith('```json'):
                        content = content[7:]
                    if content.startswith('```'):
                        content = content[3:]
                    if content.endswith('```'):
                        content = content[:-3]
                    
                    try:
                        result = json.loads(content.strip())
                        return result
                    except json.JSONDecodeError:
                        return self._use_keyword_detection(audio_transcript)
                else:
                    return self._use_keyword_detection(audio_transcript)
                    
        except Exception as e:
            print(f"[ERROR] LLM 检测失败: {e}")
            return self._use_keyword_detection(audio_transcript)
    
    async def detect(self, audio_transcript: str = None, 
                    detected_sound: str = None,
                    confidence: float = None) -> Dict:
        if detected_sound:
            return {
                'sound_type': detected_sound,
                'confidence': confidence or 0.8,
                'reason': f'前端已检测: {detected_sound}'
            }
        
        if audio_transcript:
            return await self.detect_with_llm(audio_transcript)
        
        return {'sound_type': 'unknown', 'confidence': 0.0, 'reason': '无输入数据'}


sound_detector = SoundDetector()
