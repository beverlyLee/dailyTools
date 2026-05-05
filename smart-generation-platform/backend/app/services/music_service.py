import os
import json
import base64
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.config import get_settings
from app.models import MusicGenerationHistory

settings = get_settings()


class MusicGenerationService:
    def __init__(self):
        self.output_dir = Path("generated_music")
        self.output_dir.mkdir(exist_ok=True)
    
    async def get_baidu_access_token(self) -> str:
        if not settings.BAIDU_API_KEY or not settings.BAIDU_SECRET_KEY:
            raise ValueError("百度API密钥未配置")
        
        async with aiohttp.ClientSession() as session:
            url = f"https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={settings.BAIDU_API_KEY}&client_secret={settings.BAIDU_SECRET_KEY}"
            async with session.get(url) as response:
                data = await response.json()
                return data.get("access_token", "")
    
    async def call_ernie_music(
        self,
        prompt: str,
        folk_ratio: float,
        modernity: float,
        duration: int = 30
    ) -> Dict[str, Any]:
        # 模拟ERNIE-Music API调用
        # 实际项目中应该调用真实的百度API
        
        import asyncio
        await asyncio.sleep(3)
        
        # 模拟生成的MIDI数据和音频信息
        mock_midi_data = {
            "notes": [
                {"pitch": 60, "start_time": 0, "duration": 0.5, "velocity": 80},
                {"pitch": 62, "start_time": 0.5, "duration": 0.5, "velocity": 75},
                {"pitch": 64, "start_time": 1, "duration": 1, "velocity": 85},
                {"pitch": 60, "start_time": 2, "duration": 0.5, "velocity": 80},
                {"pitch": 65, "start_time": 2.5, "duration": 1.5, "velocity": 90},
            ],
            "tempo": 120,
            "time_signature": "4/4",
            "key": "C major",
        }
        
        return {
            "status": "completed",
            "midi_data": mock_midi_data,
            "audio_path": None,  # 实际项目中应该返回音频文件路径
            "prompt": prompt,
            "folk_ratio": folk_ratio,
            "modernity": modernity,
        }
    
    async def call_skymusic(
        self,
        prompt: str,
        folk_ratio: float,
        modernity: float
    ) -> Dict[str, Any]:
        # 模拟昆仑万维SkyMusic API调用
        # 实际项目中应该调用真实的SkyMusic API
        
        import asyncio
        await asyncio.sleep(2.5)
        
        mock_midi_data = {
            "notes": [
                {"pitch": 67, "start_time": 0, "duration": 1, "velocity": 85},
                {"pitch": 69, "start_time": 1, "duration": 0.5, "velocity": 80},
                {"pitch": 71, "start_time": 1.5, "duration": 1.5, "velocity": 90},
                {"pitch": 67, "start_time": 3, "duration": 1, "velocity": 85},
            ],
            "tempo": 110,
            "time_signature": "4/4",
            "key": "G major",
        }
        
        return {
            "status": "completed",
            "midi_data": mock_midi_data,
            "audio_path": None,
            "prompt": prompt,
            "folk_ratio": folk_ratio,
            "modernity": modernity,
        }
    
    async def generate_music(
        self,
        prompt: str,
        folk_ratio: float = 0.5,
        modernity: float = 0.5,
        model: str = "ernie"
    ) -> Dict[str, Any]:
        if model == "ernie":
            return await self.call_ernie_music(prompt, folk_ratio, modernity)
        elif model == "skymusic":
            return await self.call_skymusic(prompt, folk_ratio, modernity)
        else:
            raise ValueError(f"不支持的模型: {model}")
    
    async def create_generation_task(
        self,
        db: AsyncSession,
        user_id: Optional[int],
        prompt: str,
        folk_ratio: float,
        modernity: float
    ) -> MusicGenerationHistory:
        history = MusicGenerationHistory(
            user_id=user_id,
            prompt=prompt,
            folk_ratio=folk_ratio,
            modernity=modernity,
            status="processing",
            created_at=datetime.utcnow(),
        )
        db.add(history)
        await db.commit()
        await db.refresh(history)
        return history
    
    async def update_generation_status(
        self,
        db: AsyncSession,
        history_id: int,
        status: str,
        generated_audio_path: Optional[str] = None,
        midi_data: Optional[Dict[str, Any]] = None
    ) -> None:
        stmt = update(MusicGenerationHistory).where(
            MusicGenerationHistory.id == history_id
        ).values(
            status=status,
            generated_audio_path=generated_audio_path,
            midi_data=json.dumps(midi_data) if midi_data else None,
            completed_at=datetime.utcnow() if status in ["completed", "failed"] else None
        )
        await db.execute(stmt)
        await db.commit()
    
    async def get_user_history(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> List[MusicGenerationHistory]:
        result = await db.execute(
            select(MusicGenerationHistory)
            .where(MusicGenerationHistory.user_id == user_id)
            .order_by(MusicGenerationHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    async def get_history_by_id(
        self,
        db: AsyncSession,
        history_id: int
    ) -> Optional[MusicGenerationHistory]:
        result = await db.execute(
            select(MusicGenerationHistory).where(MusicGenerationHistory.id == history_id)
        )
        return result.scalar_one_or_none()
    
    async def adjust_midi(
        self,
        midi_data: Dict[str, Any],
        adjustments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        # 模拟MIDI微调功能
        # 实际项目中应该对MIDI数据进行实际修改
        
        # 简单复制原始数据
        adjusted_data = midi_data.copy()
        
        # 应用调整（示例）
        for adj in adjustments:
            if adj.get("action") == "change_pitch":
                # 修改音符音高
                note_idx = adj.get("note_index")
                new_pitch = adj.get("new_pitch")
                if note_idx is not None and note_idx < len(adjusted_data["notes"]):
                    adjusted_data["notes"][note_idx]["pitch"] = new_pitch
            elif adj.get("action") == "change_velocity":
                # 修改力度
                note_idx = adj.get("note_index")
                new_velocity = adj.get("new_velocity")
                if note_idx is not None and note_idx < len(adjusted_data["notes"]):
                    adjusted_data["notes"][note_idx]["velocity"] = new_velocity
        
        return adjusted_data
