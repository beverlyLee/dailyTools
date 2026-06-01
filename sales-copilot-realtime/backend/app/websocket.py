import json
import base64
import asyncio
from typing import Dict, List
from fastapi import WebSocket
from .intent_service import detect_intent, get_recommendations

TRANSCRIPT_SIMULATIONS: Dict[str, List[str]] = {
    "太贵了": ["太贵了", "这价格有点超出我的预期", "能不能便宜点"],
    "功能": ["这个产品有什么功能", "主要是做什么用的", "怎么操作"],
    "不需要": ["不需要", "我们现在不用", "以后再说吧"],
    "别家": ["你们和别家比怎么样", "别家更便宜", "我再对比一下"],
}

class MockASR:
    def __init__(self):
        self.transcription_buffer = ""
    
    def transcribe_audio(self, audio_data: bytes) -> str:
        audio_str = base64.b64encode(audio_data).decode('utf-8')
        if "太贵" in audio_str[-50:] or len(audio_str) > 100:
            phrases = TRANSCRIPT_SIMULATIONS["太贵了"]
            if len(self.transcription_buffer) < len(phrases):
                self.transcription_buffer = phrases[len(self.transcription_buffer)]
                return self.transcription_buffer
        return ""
    
    def transcribe_text(self, text: str) -> str:
        return text

class CopilotSession:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.asr = MockASR()
        self.transcripts: List[str] = []
        self.last_intent = None
    
    async def start(self):
        await self.websocket.accept()
        await self.send_message("status", {"status": "connected", "message": "已连接到销售助手"})
        
        try:
            while True:
                data = await self.websocket.receive()
                
                if "text" in data:
                    message = json.loads(data["text"])
                    await self.handle_message(message)
                elif "bytes" in data:
                    await self.handle_audio(data["bytes"])
        
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            await self.cleanup()
    
    async def handle_message(self, message: dict):
        msg_type = message.get("type")
        
        if msg_type == "ping":
            await self.send_message("pong", {"timestamp": message.get("timestamp")})
        
        elif msg_type == "transcript":
            transcript = message.get("text", "")
            await self.process_transcript(transcript)
        
        elif msg_type == "reset":
            self.transcripts = []
            self.asr = MockASR()
            self.last_intent = None
            await self.send_message("status", {"status": "reset", "message": "会话已重置"})
    
    async def handle_audio(self, audio_data: bytes):
        transcript = self.asr.transcribe_audio(audio_data)
        if transcript:
            await self.process_transcript(transcript)
    
    async def process_transcript(self, transcript: str):
        if not transcript.strip():
            return
        
        self.transcripts.append(transcript)
        
        await self.send_message("transcript", {
            "text": transcript,
            "timestamp": asyncio.get_event_loop().time(),
            "speaker": "customer"
        })
        
        intent = detect_intent(transcript)
        
        if intent != self.last_intent:
            self.last_intent = intent
            recommendations = get_recommendations(intent)
            
            intent_labels = {
                "price_concern": "价格顾虑",
                "product_query": "产品咨询",
                "competitor": "竞品对比",
                "objection": "客户异议",
                "positive": "积极信号",
                "unknown": "其他意图"
            }
            
            await self.send_message("recommendation", {
                "intent": intent,
                "intent_label": intent_labels.get(intent, "其他意图"),
                "trigger": transcript,
                "scripts": recommendations,
                "timestamp": asyncio.get_event_loop().time()
            })
    
    async def send_message(self, msg_type: str, data: dict):
        await self.websocket.send_json({
            "type": msg_type,
            **data
        })
    
    async def cleanup(self):
        pass
