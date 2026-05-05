from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from typing import Optional
import io

from models import LanguageEnum
from services.tts_service import tts_engine

router = APIRouter(prefix="/tts", tags=["语音合成"])

@router.post("/synthesize")
async def synthesize_text(
    text: str = Query(..., min_length=1, max_length=500),
    language: LanguageEnum = Query(LanguageEnum.ZH)
):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")
    
    try:
        audio_data = await tts_engine.synthesize(text, language)
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename=speech.wav",
                "Content-Length": str(len(audio_data))
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")

@router.get("/synthesize/{text}")
async def synthesize_text_get(
    text: str,
    language: LanguageEnum = Query(LanguageEnum.ZH)
):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")
    
    try:
        audio_data = await tts_engine.synthesize(text, language)
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"attachment; filename=speech.wav"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")

@router.get("/languages")
async def get_supported_voices():
    return {
        "voices": [
            {"code": "zh", "name": "中文", "gender": "neutral"},
            {"code": "en", "name": "英文", "gender": "neutral"},
            {"code": "ja", "name": "日语", "gender": "neutral"},
            {"code": "ko", "name": "韩语", "gender": "neutral"}
        ]
    }

@router.get("/engine-info")
async def get_engine_info():
    from config import settings
    return {
        "engine": settings.TTS_ENGINE,
        "supported_formats": ["wav", "mp3"],
        "max_text_length": 500,
        "languages": ["zh", "en", "ja", "ko"]
    }
