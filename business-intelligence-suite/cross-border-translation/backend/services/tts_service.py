import asyncio
import tempfile
import os
from typing import Optional
from abc import ABC, abstractmethod
from config import settings

class BaseTTSEngine(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str = "zh") -> bytes:
        pass

class GTTSEngine(BaseTTSEngine):
    def __init__(self):
        self._initialized = False
    
    async def _ensure_loaded(self):
        if not self._initialized:
            try:
                import gtts
                self._initialized = True
            except Exception as e:
                print(f"Failed to load gTTS: {e}")
                raise
    
    async def synthesize(self, text: str, language: str = "zh") -> bytes:
        await self._ensure_loaded()
        
        from gtts import gTTS
        import io
        
        lang_map = {
            "zh": "zh-CN",
            "en": "en",
            "ja": "ja",
            "ko": "ko"
        }
        
        tts_lang = lang_map.get(language, "zh-CN")
        
        tts = gTTS(text=text, lang=tts_lang, slow=False)
        
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return audio_buffer.read()

class PyTTSX3Engine(BaseTTSEngine):
    def __init__(self):
        self._engine = None
        self._initialized = False
    
    async def _ensure_loaded(self):
        if not self._initialized:
            try:
                import pyttsx3
                self._engine = pyttsx3.init()
                self._initialized = True
            except Exception as e:
                print(f"Failed to load pyttsx3: {e}")
                raise
    
    async def synthesize(self, text: str, language: str = "zh") -> bytes:
        await self._ensure_loaded()
        
        import io
        import wave
        
        voices = self._engine.getProperty('voices')
        
        lang_voice_map = {
            "zh": 0,
            "en": 1,
            "ja": 2,
            "ko": 3
        }
        
        voice_index = lang_voice_map.get(language, 0)
        if voice_index < len(voices):
            self._engine.setProperty('voice', voices[voice_index].id)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp_path = tmp.name
        
        self._engine.save_to_file(text, tmp_path)
        self._engine.runAndWait()
        
        with open(tmp_path, 'rb') as f:
            audio_data = f.read()
        
        os.remove(tmp_path)
        return audio_data

class SimulatedTTSEngine(BaseTTSEngine):
    async def synthesize(self, text: str, language: str = "zh") -> bytes:
        import wave
        import struct
        import math
        
        sample_rate = 44100
        duration = 0.1
        frequency = 440
        
        n_samples = int(sample_rate * duration)
        
        audio_buffer = b""
        
        for i in range(n_samples):
            value = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            audio_buffer += struct.pack('<h', value)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            with wave.open(tmp.name, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_buffer)
            tmp_path = tmp.name
        
        with open(tmp_path, 'rb') as f:
            data = f.read()
        
        os.remove(tmp_path)
        return data

def get_tts_engine() -> BaseTTSEngine:
    engine_name = settings.TTS_ENGINE.lower()
    
    if engine_name == "gtts":
        try:
            return GTTSEngine()
        except Exception as e:
            print(f"Failed to initialize gTTS, using simulated TTS: {e}")
            return SimulatedTTSEngine()
    elif engine_name == "pyttsx3":
        try:
            return PyTTSX3Engine()
        except Exception as e:
            print(f"Failed to initialize pyttsx3, using simulated TTS: {e}")
            return SimulatedTTSEngine()
    else:
        return SimulatedTTSEngine()

tts_engine = get_tts_engine()
