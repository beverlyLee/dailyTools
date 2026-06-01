import os
import uuid
import subprocess
import json
from pathlib import Path
from typing import List, Dict
from .config import settings

class AudioProcessor:
    def __init__(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.CHUNKS_DIR, exist_ok=True)
    
    def get_audio_duration(self, file_path: str) -> float:
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", 
                 "format=duration", "-of", 
                 "default=noprint_wrappers=1:nokey=1", file_path],
                capture_output=True,
                text=True
            )
            return float(result.stdout.strip())
        except:
            return 0.0
    
    def split_by_silence(self, file_path: str, audiobook_id: int) -> List[Dict]:
        chunks_dir = os.path.join(settings.CHUNKS_DIR, str(audiobook_id))
        os.makedirs(chunks_dir, exist_ok=True)
        
        duration = self.get_audio_duration(file_path)
        
        chunks = []
        chunk_duration = 120.0
        chunk_index = 0
        current_time = 0.0
        
        while current_time < duration:
            end_time = min(current_time + chunk_duration, duration)
            chunk_path = os.path.join(chunks_dir, f"chunk_{chunk_index}.mp3")
            
            try:
                subprocess.run([
                    "ffmpeg", "-i", file_path,
                    "-ss", str(current_time),
                    "-to", str(end_time),
                    "-c", "copy",
                    "-y", chunk_path
                ], capture_output=True)
                
                chunks.append({
                    "index": chunk_index,
                    "start_time": current_time,
                    "end_time": end_time,
                    "file_path": chunk_path
                })
            except Exception as e:
                print(f"Error creating chunk {chunk_index}: {e}")
            
            chunk_index += 1
            current_time = end_time
        
        return chunks
    
    def transcribe_chunk(self, chunk_path: str) -> str:
        return f"这是音频片段 {os.path.basename(chunk_path)} 的模拟转录文本。"

audio_processor = AudioProcessor()
