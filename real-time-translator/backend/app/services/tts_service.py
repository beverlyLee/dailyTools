import io
import os
import asyncio
from typing import Dict, Any, Optional
from app.config import settings

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("edge-tts not installed. TTS will use mock implementation.")

class TTSService:
    def __init__(self):
        self.default_voice = settings.TTS_VOICE_NAME
        self.voice_map = {
            "zh": "zh-CN-XiaoxiaoNeural",
            "en": "en-US-JennyNeural",
            "ja": "ja-JP-NanamiNeural",
            "ko": "ko-KR-SunHiNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
            "es": "es-ES-ElviraNeural"
        }
    
    def _get_voice_by_language(self, language: str) -> str:
        return self.voice_map.get(language, self.default_voice)
    
    def _create_mock_audio(self, text: str) -> bytes:
        mock_wav_header = (
            b'RIFF\x24\x80\x00\x00WAVEfmt\x20\x10\x00\x00\x00'
            b'\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00'
            b'data\x00\x80\x00\x00'
        )
        
        audio_length = 8000 * 2
        mock_audio_data = bytes([0x80] * audio_length)
        
        return mock_wav_header + mock_audio_data
    
    async def synthesize(
        self,
        text: str,
        language: str = "zh",
        voice: Optional[str] = None,
        rate: float = 1.0,
        pitch: float = 1.0
    ) -> bytes:
        if not EDGE_TTS_AVAILABLE:
            print("edge-tts not available. Using mock TTS.")
            return self._create_mock_audio(text)
        
        try:
            selected_voice = voice if voice else self._get_voice_by_language(language)
            
            rate_str = f"+{int((rate - 1) * 100)}%" if rate >= 1 else f"{int((rate - 1) * 100)}%"
            pitch_str = f"+{int((pitch - 1) * 50)}Hz" if pitch >= 1 else f"{int((pitch - 1) * 50)}Hz"
            
            communicate = edge_tts.Communicate(
                text,
                selected_voice,
                rate=rate_str,
                pitch=pitch_str
            )
            
            audio_buffer = io.BytesIO()
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])
            
            audio_buffer.seek(0)
            audio_data = audio_buffer.read()
            
            if len(audio_data) == 0:
                print("TTS returned empty audio. Using mock.")
                return self._create_mock_audio(text)
            
            return audio_data
            
        except Exception as e:
            print(f"TTS synthesis error: {e}")
            return self._create_mock_audio(text)
    
    async def synthesize_to_file(
        self,
        text: str,
        output_path: str,
        language: str = "zh",
        voice: Optional[str] = None,
        rate: float = 1.0,
        pitch: float = 1.0
    ) -> str:
        audio_data = await self.synthesize(
            text=text,
            language=language,
            voice=voice,
            rate=rate,
            pitch=pitch
        )
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, "wb") as f:
            f.write(audio_data)
        
        return output_path
    
    def get_available_voices(self) -> Dict[str, str]:
        return self.voice_map.copy()
