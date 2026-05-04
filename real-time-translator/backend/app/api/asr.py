from fastapi import APIRouter, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from app.services.asr_service import ASRService
from pydantic import BaseModel
from typing import Optional
import json
import io

router = APIRouter(prefix="/asr", tags=["语音识别"])

class ASRResponse(BaseModel):
    text: str
    language: str
    confidence: Optional[float] = None
    is_final: bool = True

@router.post("/transcribe", response_model=ASRResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: str = Form("zh"),
    task: str = Form("transcribe")
):
    asr_service = ASRService()
    
    audio_data = await audio_file.read()
    result = await asr_service.transcribe(audio_data, language=language, task=task)
    
    return ASRResponse(
        text=result["text"],
        language=language,
        confidence=result.get("confidence")
    )

@router.websocket("/stream")
async def stream_transcription(websocket: WebSocket):
    await websocket.accept()
    
    asr_service = ASRService()
    buffer = io.BytesIO()
    transcription_buffer = ""
    
    try:
        while True:
            data = await websocket.receive_bytes()
            
            if data == b"END":
                if buffer.getvalue():
                    final_result = await asr_service.transcribe(
                        buffer.getvalue(),
                        language="zh"
                    )
                    full_text = transcription_buffer + final_result["text"]
                    await websocket.send_json({
                        "type": "final",
                        "text": full_text,
                        "confidence": final_result.get("confidence", 0.9)
                    })
                buffer = io.BytesIO()
                transcription_buffer = ""
                continue
            
            buffer.write(data)
            
            if len(buffer.getvalue()) > 4000:
                chunk_data = buffer.getvalue()
                result = await asr_service.transcribe(chunk_data, language="zh")
                
                if result["text"]:
                    transcription_buffer += result["text"] + " "
                    await websocket.send_json({
                        "type": "partial",
                        "text": transcription_buffer,
                        "confidence": result.get("confidence", 0.8)
                    })
                
                buffer = io.BytesIO()
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
