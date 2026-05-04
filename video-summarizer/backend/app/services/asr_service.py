import os
import whisper
from typing import List, Dict, Any, Optional
from app.config import settings


class ASRService:
    def __init__(self):
        self.model = None
        self.model_name = settings.WHISPER_MODEL
    
    def _load_model(self):
        if self.model is None:
            self.model = whisper.load_model(self.model_name)
        return self.model
    
    def transcribe(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        model = self._load_model()
        
        transcribe_kwargs = {"language": language} if language else {}
        result = model.transcribe(audio_path, **transcribe_kwargs)
        
        full_text = result.get("text", "")
        language = result.get("language", "zh")
        
        segments = []
        for segment in result.get("segments", []):
            segments.append({
                "start_time": segment["start"],
                "end_time": segment["end"],
                "text": segment["text"].strip(),
                "confidence": segment.get("avg_logprob", 0.0),
            })
        
        return {
            "full_text": full_text,
            "language": language,
            "segments": segments,
        }
    
    def transcribe_with_timestamps(self, audio_path: str, language: Optional[str] = None) -> List[Dict[str, Any]]:
        result = self.transcribe(audio_path, language)
        return result["segments"]


asr_service = ASRService()
