import httpx
import json
from typing import Optional, Dict, Any
from ..config import settings


class MusicGeneratorService:
    def __init__(self):
        self.model = settings.MUSIC_GENERATION_MODEL
        self.baidu_access_token = settings.BAIDU_ACCESS_TOKEN
        self.kunlun_api_key = settings.KUNLUN_API_KEY
    
    async def generate_music(
        self,
        keywords: str,
        folk_ratio: float = 0.5,
        modern_ratio: float = 0.5,
        duration: int = 30
    ) -> Dict[str, Any]:
        if self.model == "baidu":
            return await self._generate_with_baidu(keywords, folk_ratio, modern_ratio, duration)
        elif self.model == "kunlun":
            return await self._generate_with_kunlun(keywords, folk_ratio, modern_ratio, duration)
        else:
            return await self._generate_mock(keywords, folk_ratio, modern_ratio, duration)
    
    async def _generate_with_baidu(
        self,
        keywords: str,
        folk_ratio: float,
        modern_ratio: float,
        duration: int
    ) -> Dict[str, Any]:
        if not self.baidu_access_token:
            return await self._generate_mock(keywords, folk_ratio, modern_ratio, duration)
        
        url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2music?access_token={self.baidu_access_token}"
        
        style_prompt = self._build_style_prompt(keywords, folk_ratio, modern_ratio)
        
        payload = {
            "prompt": style_prompt,
            "duration": duration,
            "style": self._determine_style(folk_ratio, modern_ratio)
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            data = response.json()
            
            if "task_id" in data:
                return {
                    "task_id": data["task_id"],
                    "status": "processing",
                    "message": "音乐生成中，请稍后查询结果"
                }
            else:
                return {
                    "status": "error",
                    "message": data.get("error_msg", "生成失败")
                }
    
    async def _generate_with_kunlun(
        self,
        keywords: str,
        folk_ratio: float,
        modern_ratio: float,
        duration: int
    ) -> Dict[str, Any]:
        if not self.kunlun_api_key:
            return await self._generate_mock(keywords, folk_ratio, modern_ratio, duration)
        
        url = "https://api.skymusic.kunlun.com/v1/generate"
        
        headers = {
            "Authorization": f"Bearer {self.kunlun_api_key}",
            "Content-Type": "application/json"
        }
        
        style_prompt = self._build_style_prompt(keywords, folk_ratio, modern_ratio)
        
        payload = {
            "prompt": style_prompt,
            "duration": duration,
            "parameters": {
                "folk_ratio": folk_ratio,
                "modern_ratio": modern_ratio
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            data = response.json()
            
            return data
    
    async def _generate_mock(
        self,
        keywords: str,
        folk_ratio: float,
        modern_ratio: float,
        duration: int
    ) -> Dict[str, Any]:
        import uuid
        import random
        
        mock_midi = self._generate_mock_midi(keywords, folk_ratio, modern_ratio)
        
        return {
            "task_id": str(uuid.uuid4()),
            "status": "completed",
            "message": "音乐生成成功 (演示模式)",
            "keywords": keywords,
            "folk_ratio": folk_ratio,
            "modern_ratio": modern_ratio,
            "duration": duration,
            "midi_data": mock_midi,
            "audio_url": None,
            "style": self._determine_style(folk_ratio, modern_ratio)
        }
    
    def _build_style_prompt(self, keywords: str, folk_ratio: float, modern_ratio: float) -> str:
        style_desc = []
        
        if folk_ratio > 0.6:
            style_desc.append("中国传统民乐风格")
            if folk_ratio > 0.8:
                style_desc.append("大量使用古筝、二胡、琵琶等民族乐器")
        
        if modern_ratio > 0.6:
            style_desc.append("现代电子音乐风格")
            if modern_ratio > 0.8:
                style_desc.append("强烈的电子节拍和合成器音色")
        
        if 0.3 <= folk_ratio <= 0.7 and 0.3 <= modern_ratio <= 0.7:
            style_desc.append("国潮风格，传统与现代融合")
        
        style_str = "，".join(style_desc) if style_desc else "国潮音乐风格"
        
        return f"{keywords}，{style_str}"
    
    def _determine_style(self, folk_ratio: float, modern_ratio: float) -> str:
        if folk_ratio > 0.7:
            return "traditional"
        elif modern_ratio > 0.7:
            return "modern"
        else:
            return "fusion"
    
    def _generate_mock_midi(self, keywords: str, folk_ratio: float, modern_ratio: float) -> str:
        import json
        
        notes = []
        base_scale = [60, 62, 64, 65, 67, 69, 71, 72]
        
        if folk_ratio > 0.5:
            base_scale = [60, 62, 64, 67, 69]
        
        num_notes = 32
        for i in range(num_notes):
            note = {
                "pitch": base_scale[i % len(base_scale)] + (i // 8) * 12,
                "start": i * 0.25,
                "duration": 0.25,
                "velocity": 80 + (i % 3) * 10
            }
            notes.append(note)
        
        midi_data = {
            "tracks": [
                {
                    "name": "Melody",
                    "instrument": "Piano" if modern_ratio > folk_ratio else "Guzheng",
                    "notes": notes
                }
            ],
            "tempo": 120,
            "time_signature": "4/4"
        }
        
        return json.dumps(midi_data)
    
    async def check_task_status(self, task_id: str) -> Dict[str, Any]:
        if self.model == "baidu" and self.baidu_access_token:
            url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2music?access_token={self.baidu_access_token}"
            payload = {"task_id": task_id}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                return response.json()
        
        return {
            "task_id": task_id,
            "status": "completed",
            "message": "任务已完成"
        }


music_generator = MusicGeneratorService()
