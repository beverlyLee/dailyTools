import os
import subprocess
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any
from app.config import settings


class VideoProcessor:
    def __init__(self):
        self.ffmpeg_path = settings.FFMPEG_PATH
        self.ffprobe_path = settings.FFPROBE_PATH
    
    def get_video_info(self, video_path: str) -> Dict[str, Any]:
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        info = json.loads(result.stdout)
        
        video_stream = next(
            (s for s in info.get("streams", []) if s.get("codec_type") == "video"),
            None
        )
        
        return {
            "duration": float(info.get("format", {}).get("duration", 0)),
            "file_size": int(info.get("format", {}).get("size", 0)),
            "width": int(video_stream.get("width", 0)) if video_stream else 0,
            "height": int(video_stream.get("height", 0)) if video_stream else 0,
            "fps": self._parse_fps(video_stream.get("r_frame_rate", "0/1")) if video_stream else 0.0,
        }
    
    def _parse_fps(self, fps_str: str) -> float:
        if "/" in fps_str:
            num, den = fps_str.split("/")
            return float(num) / float(den) if den != "0" else 0.0
        return float(fps_str)
    
    def extract_audio(self, video_path: str, output_dir: Optional[str] = None) -> str:
        if output_dir is None:
            output_dir = settings.OUTPUT_DIR
        
        os.makedirs(output_dir, exist_ok=True)
        
        output_filename = f"{uuid.uuid4()}.wav"
        output_path = os.path.join(output_dir, output_filename)
        
        cmd = [
            self.ffmpeg_path,
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-y",
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, check=True)
        return output_path
    
    def extract_frame(self, video_path: str, timestamp: float, output_path: str, width: Optional[int] = None) -> str:
        cmd = [
            self.ffmpeg_path,
            "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
        ]
        
        if width:
            cmd.extend(["-vf", f"scale={width}:-1"])
        
        cmd.extend(["-y", output_path])
        
        subprocess.run(cmd, capture_output=True, check=True)
        return output_path
    
    def get_frame_at_time(self, video_path: str, timestamp: float, output_dir: Optional[str] = None, width: Optional[int] = 640) -> str:
        if output_dir is None:
            output_dir = settings.OUTPUT_DIR
        
        os.makedirs(output_dir, exist_ok=True)
        
        output_filename = f"frame_{uuid.uuid4()}.jpg"
        output_path = os.path.join(output_dir, output_filename)
        
        return self.extract_frame(video_path, timestamp, output_path, width)


video_processor = VideoProcessor()
