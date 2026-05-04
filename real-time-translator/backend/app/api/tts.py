from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from app.services.tts_service import TTSService
from pydantic import BaseModel
from typing import Optional
import io

router = APIRouter(prefix="/tts", tags=["语音合成"])

class TTSRequest(BaseModel):
    text: str
    language: str = "zh"
    voice: Optional[str] = None
    rate: float = 1.0
    pitch: float = 1.0

@router.post("/synthesize")
async def synthesize_speech(request: TTSRequest):
    tts_service = TTSService()
    
    audio_data = await tts_service.synthesize(
        text=request.text,
        language=request.language,
        voice=request.voice,
        rate=request.rate,
        pitch=request.pitch
    )
    
    return StreamingResponse(
        io.BytesIO(audio_data),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f"attachment; filename=tts_output.mp3",
            "Content-Type": "audio/mpeg"
        }
    )

@router.get("/voices")
async def get_available_voices():
    voices = [
        {
            "language": "zh",
            "name": "zh-CN-XiaoxiaoNeural",
            "display_name": "晓晓 (中文女)",
            "gender": "Female",
            "locale": "zh-CN"
        },
        {
            "language": "zh",
            "name": "zh-CN-YunxiNeural",
            "display_name": "云希 (中文男)",
            "gender": "Male",
            "locale": "zh-CN"
        },
        {
            "language": "en",
            "name": "en-US-JennyNeural",
            "display_name": "Jenny (英语女)",
            "gender": "Female",
            "locale": "en-US"
        },
        {
            "language": "en",
            "name": "en-US-GuyNeural",
            "display_name": "Guy (英语男)",
            "gender": "Male",
            "locale": "en-US"
        },
        {
            "language": "ja",
            "name": "ja-JP-NanamiNeural",
            "display_name": "七海 (日语女)",
            "gender": "Female",
            "locale": "ja-JP"
        },
        {
            "language": "ja",
            "name": "ja-JP-KeitaNeural",
            "display_name": "圭太 (日语男)",
            "gender": "Male",
            "locale": "ja-JP"
        },
        {
            "language": "ko",
            "name": "ko-KR-SunHiNeural",
            "display_name": "善熙 (韩语女)",
            "gender": "Female",
            "locale": "ko-KR"
        },
        {
            "language": "ko",
            "name": "ko-KR-InJoonNeural",
            "display_name": "仁俊 (韩语男)",
            "gender": "Male",
            "locale": "ko-KR"
        }
    ]
    
    return {"voices": voices}
