import os
import io
import wave
import tempfile
from typing import Optional, Dict, Any
import numpy as np
from app.config import settings

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("Whisper not installed. ASR will use mock implementation.")

class ASRService:
    def __init__(self):
        self.model = None
        self.model_name = settings.ASR_MODEL_NAME
        self._loaded = False
    
    async def _load_model(self):
        if self._loaded:
            return
        
        if not WHISPER_AVAILABLE:
            print("Whisper not available. Using mock ASR.")
            self._loaded = True
            return
        
        try:
            print(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
            self._loaded = True
            print(f"Whisper model loaded successfully")
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            print("Using mock ASR due to model loading failure.")
            self._loaded = True
    
    def _convert_audio_to_wav(self, audio_data: bytes) -> str:
        temp_path = tempfile.mktemp(suffix=".wav")
        
        try:
            with wave.open(temp_path, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)
                wav_file.writeframes(audio_data)
        except:
            with open(temp_path, 'wb') as f:
                f.write(audio_data)
        
        return temp_path
    
    def _mock_transcribe(self, audio_data: bytes, language: str) -> Dict[str, Any]:
        return {
            "text": f"这是{language}语音识别的模拟结果。您的音频长度约为{len(audio_data)}字节。",
            "language": language,
            "confidence": 0.85
        }
    
    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "zh",
        task: str = "transcribe"
    ) -> Dict[str, Any]:
        await self._load_model()
        
        if not WHISPER_AVAILABLE or self.model is None:
            return self._mock_transcribe(audio_data, language)
        
        try:
            temp_audio_path = self._convert_audio_to_wav(audio_data)
            
            try:
                language_map = {
                    "zh": "zh",
                    "en": "en",
                    "ja": "ja",
                    "ko": "ko",
                    "fr": "fr",
                    "de": "de",
                    "es": "es"
                }
                
                whisper_lang = language_map.get(language, language)
                
                result = self.model.transcribe(
                    temp_audio_path,
                    language=whisper_lang,
                    task=task,
                    fp16=False
                )
                
                transcribed_text = result.get("text", "")
                detected_language = result.get("language", whisper_lang)
                
                segments = result.get("segments", [])
                if segments:
                    avg_confidence = sum(seg.get("avg_logprob", -1) for seg in segments) / len(segments)
                    confidence = np.exp(avg_confidence)
                else:
                    confidence = 0.9
                
                return {
                    "text": transcribed_text.strip(),
                    "language": detected_language,
                    "confidence": confidence
                }
                
            finally:
                if os.path.exists(temp_audio_path):
                    os.remove(temp_audio_path)
                    
        except Exception as e:
            print(f"ASR transcription error: {e}")
            return self._mock_transcribe(audio_data, language)
    
    async def transcribe_stream(
        self,
        audio_chunk: bytes,
        language: str = "zh"
    ) -> Dict[str, Any]:
        return await self.transcribe(audio_chunk, language)
