from fastapi import APIRouter, UploadFile, File, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from typing import Optional, List
import json
import asyncio

from models import ASRResponse, LanguageEnum
from services.asr_service import asr_engine

router = APIRouter(prefix="/asr", tags=["语音识别"])

@router.post("/recognize", response_model=ASRResponse)
async def recognize_audio(
    audio: UploadFile = File(...),
    language: LanguageEnum = Query(LanguageEnum.ZH)
):
    audio_data = await audio.read()
    text = await asr_engine.transcribe(audio_data, language)
    
    return ASRResponse(text=text, is_final=True)

@router.post("/recognize-bytes", response_model=ASRResponse)
async def recognize_audio_bytes(
    audio_data: bytes,
    language: LanguageEnum = Query(LanguageEnum.ZH)
):
    text = await asr_engine.transcribe(audio_data, language)
    
    return ASRResponse(text=text, is_final=True)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        language = "zh"
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                msg_type = message.get("type", "")
                
                if msg_type == "config":
                    language = message.get("language", "zh")
                    await manager.send_message({"type": "config_ack", "language": language}, websocket)
                
                elif msg_type == "audio":
                    audio_bytes = message.get("data", b"")
                    if isinstance(audio_bytes, str):
                        import base64
                        audio_bytes = base64.b64decode(audio_bytes)
                    
                    text = await asr_engine.transcribe(audio_bytes, language)
                    
                    await manager.send_message({
                        "type": "transcription",
                        "text": text,
                        "is_final": True
                    }, websocket)
                
                elif msg_type == "ping":
                    await manager.send_message({"type": "pong"}, websocket)
            
            except json.JSONDecodeError:
                await manager.send_message({"type": "error", "message": "Invalid JSON"}, websocket)
            except Exception as e:
                await manager.send_message({"type": "error", "message": str(e)}, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@router.get("/languages")
async def get_supported_languages():
    return {
        "languages": [
            {"code": "zh", "name": "中文"},
            {"code": "中文中文", "name": "英文"},
            {"code": "ja", "name": "日语"},
            {"code": "ko", "name": "韩语"}
        ]
    }
