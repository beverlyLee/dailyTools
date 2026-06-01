from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from typing import Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationManager:
    def __init__(self):
        self.base_translations_zh_en: Dict[str, str] = {
            "你好": "Hello", "我是": "I am", "我们": "we", "今天": "today",
            "会议": "meeting", "开始": "start", "结束": "end", "谢谢": "thank you",
            "感谢": "thanks", "大家": "everyone", "好": "good", "早上": "morning",
            "下午": "afternoon", "晚上": "evening", "项目": "project", "产品": "product",
            "技术": "technology", "团队": "team", "工作": "work", "任务": "task",
            "完成": "complete", "需要": "need", "希望": "hope", "可以": "can",
            "是": "is", "在": "in", "有": "have", "和": "and", "对": "yes",
            "不": "no", "这个": "this", "那个": "that", "什么": "what",
            "怎么": "how", "为什么": "why", "时候": "when", "哪里": "where",
            "的": "'s", "，": ", ", "。": ".", "！": "!", "？": "?",
        }
        
        self.base_translations_en_zh: Dict[str, str] = {
            "Hello": "你好", "I am": "我是", "we": "我们", "today": "今天",
            "meeting": "会议", "start": "开始", "end": "结束", "thank you": "谢谢",
            "thanks": "感谢", "everyone": "大家", "good": "好", "morning": "早上",
            "afternoon": "下午", "evening": "晚上", "project": "项目", "product": "产品",
            "technology": "技术", "team": "团队", "work": "工作", "task": "任务",
            "complete": "完成", "need": "需要", "hope": "希望", "can": "可以",
            "is": "是", "in": "在", "have": "有", "and": "和", "yes": "对",
            "no": "不", "this": "这个", "that": "那个", "what": "什么",
            "how": "怎么", "why": "为什么", "when": "时候", "where": "哪里",
        }
    
    def apply_terminology(self, text: str, terminology: Dict[str, str]) -> str:
        result = text
        sorted_terms = sorted(terminology.keys(), key=len, reverse=True)
        for source in sorted_terms:
            target = terminology[source]
            result = result.replace(source, f"{{{{TERM_{target}}}}}")
        return result
    
    def restore_terminology(self, text: str) -> str:
        import re
        pattern = r"\{\{TERM_(.*?)\}\}"
        matches = re.findall(pattern, text)
        for match in matches:
            text = text.replace(f"{{{{TERM_{match}}}}}", match)
        return text
    
    def translate_text(self, text: str, source_lang: str, target_lang: str, terminology: Dict[str, str] = None) -> str:
        if terminology is None:
            terminology = {}
        
        text_with_terms = self.apply_terminology(text, terminology)
        
        if source_lang == 'zh-CN' and target_lang == 'en-US':
            result = text_with_terms
            sorted_keys = sorted(self.base_translations_zh_en.keys(), key=len, reverse=True)
            for cn in sorted_keys:
                en = self.base_translations_zh_en[cn]
                result = result.replace(cn, en)
            return self.restore_terminology(result)
            
        elif source_lang == 'en-US' and target_lang == 'zh-CN':
            result = text_with_terms
            sorted_keys = sorted(self.base_translations_en_zh.keys(), key=len, reverse=True)
            for en in sorted_keys:
                cn = self.base_translations_en_zh[en]
                result = result.replace(en, cn)
            return self.restore_terminology(result)
            
        return text

manager = TranslationManager()

@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            text = message.get("text", "")
            source_lang = message.get("source_lang", "zh-CN")
            target_lang = message.get("target_lang", "en-US")
            role = message.get("role", "speaker")
            terminology = message.get("terminology", {})
            
            chars = list(text)
            for i, char in enumerate(chars):
                translated_char = manager.translate_text(char, source_lang, target_lang, terminology)
                await asyncio.sleep(0.05)
                await websocket.send_text(json.dumps({
                    "type": "chunk",
                    "original": char,
                    "translated": translated_char,
                    "position": i,
                    "role": role
                }))
            
            full_translated = manager.translate_text(text, source_lang, target_lang, terminology)
            await websocket.send_text(json.dumps({
                "type": "complete",
                "original": text,
                "translated": full_translated,
                "role": role
            }))
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

@app.get("/")
async def root():
    return {"message": "Realtime Translator Board API"}
