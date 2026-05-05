import asyncio
import numpy as np
from typing import Optional, AsyncGenerator
from abc import ABC, abstractmethod
from config import settings

class BaseASREngine(ABC):
    @abstractmethod
    async def transcribe(self, audio_data: bytes, language: str = "zh") -> str:
        pass
    
    @abstractmethod
    async def transcribe_stream(self, audio_chunks: AsyncGenerator[bytes, None], language: str = "zh") -> AsyncGenerator[str, None]:
        pass

class WhisperASREngine(BaseASREngine):
    def __init__(self):
        self.model = None
        self._initialized = False
    
    async def _ensure_loaded(self):
        if not self._initialized:
            try:
                import whisper
                self.model = whisper.load_model(settings.ASR_MODEL)
                self._initialized = True
            except Exception as e:
                print(f"Failed to load Whisper model: {e}")
                raise
    
    async def transcribe(self, audio_data: bytes, language: str = "zh") -> str:
        await self._ensure_loaded()
        
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        try:
            result = self.model.transcribe(tmp_path, language=language)
            return result["text"].strip()
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    async def transcribe_stream(self, audio_chunks: AsyncGenerator[bytes, None], language: str = "zh") -> AsyncGenerator[str, None]:
        await self._ensure_loaded()
        
        import tempfile
        import os
        import wave
        
        audio_buffer = b""
        
        async for chunk in audio_chunks:
            audio_buffer += chunk
            
            if len(audio_buffer) >= 32000 * 2:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                    with wave.open(tmp.name, 'wb') as wav_file:
                        wav_file.setnchannels(1)
                        wav_file.setsampwidth(2)
                        wav_file.setframerate(16000)
                        wav_file.writeframes(audio_buffer)
                    tmp_path = tmp.name
                
                try:
                    result = self.model.transcribe(tmp_path, language=language)
                    text = result["text"].strip()
                    if text:
                        yield text
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
                
                audio_buffer = b""

class SimulatedASREngine(BaseASREngine):
    async def transcribe(self, audio_data: bytes, language: str = "zh") -> str:
        sample_texts = {
            "zh": ["您好，很高兴认识您。", "今天天气很好。", "我们来讨论一下商务合作。"],
            "en": ["Hello, nice to meet you.", "The weather is nice today.", "Let's discuss business cooperation."],
            "ja": ["こんにちは、お会いできて光栄です。", "今日は天気がいいですね。"],
            "ko": ["안녕하세요, 만나서 반갑습니다.", "오늘 날씨가 좋네요."]
        }
        import random
        return random.choice(sample_texts.get(language, sample_texts["zh"]))
    
    async def transcribe_stream(self, audio_chunks: AsyncGenerator[bytes, None], language: str = "zh") -> AsyncGenerator[str, None]:
        sample_phrases = {
            "zh": ["您好", "很高兴", "认识您", "今天", "天气", "很好"],
            "en": ["Hello", "nice", "to", "meet", "you", "today"],
            "ja": ["こんにちは", "お会い", "できて", "光栄です"],
            "ko": ["안녕하세요", "만나서", "반갑습니다"]
        }
        phrases = sample_phrases.get(language, sample_phrases["zh"])
        
        import random
        async for _ in audio_chunks:
            phrase = random.choice(phrases)
            yield phrase
            await asyncio.sleep(0.1)

def get_asr_engine() -> BaseASREngine:
    engine_name = settings.ASR_ENGINE.lower()
    
    if engine_name == "whisper":
        try:
            return WhisperASREngine()
        except Exception as e:
            print(f"Failed to initialize Whisper, using simulated ASR: {e}")
            return SimulatedASREngine()
    else:
        return SimulatedASREngine()

asr_engine = get_asr_engine()
