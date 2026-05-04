from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.translation_service import TranslationService
from app.services.asr_service import ASRService
from app.services.tts_service import TTSService
from app.models.models import TranslationHistory
from pydantic import BaseModel
from typing import Optional, List
import json
import io

router = APIRouter(prefix="/translation", tags=["翻译"])

class TranslationRequest(BaseModel):
    source_text: str
    source_language: str = "zh"
    target_language: str = "en"
    optimize_business: bool = True

class TranslationResponse(BaseModel):
    source_text: str
    translated_text: str
    source_language: str
    target_language: str
    confidence: Optional[float] = None

@router.post("/text", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    db: AsyncSession = Depends(get_db)
):
    translation_service = TranslationService()
    
    result = await translation_service.translate(
        source_text=request.source_text,
        source_language=request.source_language,
        target_language=request.target_language,
        optimize_business=request.optimize_business
    )
    
    history = TranslationHistory(
        source_text=request.source_text,
        translated_text=result["translated_text"],
        source_language=request.source_language,
        target_language=request.target_language
    )
    db.add(history)
    await db.commit()
    
    return TranslationResponse(
        source_text=request.source_text,
        translated_text=result["translated_text"],
        source_language=request.source_language,
        target_language=request.target_language,
        confidence=result.get("confidence")
    )

@router.post("/speech")
async def translate_speech(
    audio_file: UploadFile = File(...),
    source_language: str = Form("zh"),
    target_language: str = Form("en"),
    optimize_business: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    asr_service = ASRService()
    translation_service = TranslationService()
    
    audio_data = await audio_file.read()
    transcription = await asr_service.transcribe(audio_data, language=source_language)
    
    result = await translation_service.translate(
        source_text=transcription["text"],
        source_language=source_language,
        target_language=target_language,
        optimize_business=optimize_business
    )
    
    history = TranslationHistory(
        source_text=transcription["text"],
        translated_text=result["translated_text"],
        source_language=source_language,
        target_language=target_language
    )
    db.add(history)
    await db.commit()
    
    return JSONResponse({
        "source_text": transcription["text"],
        "translated_text": result["translated_text"],
        "source_language": source_language,
        "target_language": target_language,
        "asr_confidence": transcription.get("confidence"),
        "translation_confidence": result.get("confidence")
    })

@router.get("/languages")
async def get_supported_languages():
    languages = [
        {"code": "zh", "name": "中文", "voice": "zh-CN-XiaoxiaoNeural"},
        {"code": "en", "name": "英语", "voice": "en-US-JennyNeural"},
        {"code": "ja", "name": "日语", "voice": "ja-JP-NanamiNeural"},
        {"code": "ko", "name": "韩语", "voice": "ko-KR-SunHiNeural"},
        {"code": "fr", "name": "法语", "voice": "fr-FR-DeniseNeural"},
        {"code": "de", "name": "德语", "voice": "de-DE-KatjaNeural"},
        {"code": "es", "name": "西班牙语", "voice": "es-ES-ElviraNeural"}
    ]
    
    language_pairs = []
    for source in languages:
        for target in languages:
            if source["code"] != target["code"]:
                language_pairs.append({
                    "source": source,
                    "target": target
                })
    
    return {"languages": languages, "supported_pairs": language_pairs}
