#!/usr/bin/env python3
"""
视频转换模块：使用 MoviePy 进行视频转 GIF/WebM
"""

import os
import threading
from typing import Dict, Any, List, Optional, Callable
from datetime import timedelta

try:
    from moviepy.editor import VideoFileClip, CompositeVideoClip
    from moviepy.video.fx.all import resize
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class VideoConverter:
    def __init__(self):
        self.is_converting = False
        self.conversion_thread = None
        self.stop_event = threading.Event()
        
    def check_dependencies(self) -> Dict[str, bool]:
        return {
            "moviepy": MOVIEPY_AVAILABLE,
            "pillow": PIL_AVAILABLE
        }
        
    def get_video_info(self, video_path: str) -> Optional[Dict[str, Any]]:
        if not MOVIEPY_AVAILABLE:
            return None
            
        try:
            clip = VideoFileClip(video_path)
            info = {
                "duration": clip.duration,
                "fps": clip.fps,
                "size": clip.size,
                "width": clip.size[0],
                "height": clip.size[1],
                "filename": os.path.basename(video_path),
                "filesize": os.path.getsize(video_path)
            }
            clip.close()
            return info
        except Exception as e:
            print(f"Error getting video info: {e}")
            return None
            
    def format_time(self, seconds: float) -> str:
        td = timedelta(seconds=seconds)
        hours = td.seconds // 3600
        minutes = (td.seconds % 3600) // 60
        secs = td.seconds % 60
        millis = int(td.microseconds / 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"
        
    def parse_time(self, time_str: str) -> float:
        try:
            parts = time_str.split(':')
            if len(parts) == 3:
                hours = int(parts[0])
                minutes = int(parts[1])
                seconds = float(parts[2])
                return hours * 3600 + minutes * 60 + seconds
            elif len(parts) == 2:
                minutes = int(parts[0])
                seconds = float(parts[1])
                return minutes * 60 + seconds
            else:
                return float(time_str)
        except:
            return 0.0
            
    def convert_to_gif(
        self,
        video_path: str,
        output_path: str,
        start_time: float = 0.0,
        end_time: Optional[float] = None,
        fps: int = 10,
        resolution: Optional[tuple] = None,
        loop: int = 0,
        colors: int = 256,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> bool:
        if not MOVIEPY_AVAILABLE:
            if progress_callback:
                progress_callback(0, "错误: MoviePy 未安装")
            return False
            
        try:
            if progress_callback:
                progress_callback(0, "正在加载视频...")
                
            clip = VideoFileClip(video_path)
            
            if end_time is None:
                end_time = clip.duration
                
            if start_time > 0 or end_time < clip.duration:
                clip = clip.subclip(start_time, end_time)
                
            if resolution:
                clip = resize(clip, height=resolution[1]) if resolution[1] else resize(clip, width=resolution[0])
                
            if progress_callback:
                progress_callback(0.2, "正在生成 GIF...")
                
            self.stop_event.clear()
            
            clip.write_gif(
                output_path,
                fps=fps,
                program='ffmpeg',
                opt=f'optimizeplus -colors {colors}',
                loop=loop
            )
            
            clip.close()
            
            if progress_callback:
                progress_callback(1.0, f"转换完成: {output_path}")
                
            return True
            
        except Exception as e:
            if progress_callback:
                progress_callback(0, f"转换失败: {str(e)}")
            print(f"Error converting to GIF: {e}")
            return False
            
    def convert_to_webm(
        self,
        video_path: str,
        output_path: str,
        start_time: float = 0.0,
        end_time: Optional[float] = None,
        fps: int = 10,
        resolution: Optional[tuple] = None,
        bitrate: str = "1M",
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> bool:
        if not MOVIEPY_AVAILABLE:
            if progress_callback:
                progress_callback(0, "错误: MoviePy 未安装")
            return False
            
        try:
            if progress_callback:
                progress_callback(0, "正在加载视频...")
                
            clip = VideoFileClip(video_path)
            
            if end_time is None:
                end_time = clip.duration
                
            if start_time > 0 or end_time < clip.duration:
                clip = clip.subclip(start_time, end_time)
                
            if resolution:
                clip = resize(clip, height=resolution[1]) if resolution[1] else resize(clip, width=resolution[0])
                
            if progress_callback:
                progress_callback(0.2, "正在生成 WebM...")
                
            clip.write_videofile(
                output_path,
                fps=fps,
                codec='libvpx-vp9',
                bitrate=bitrate,
                audio_codec='libvorbis',
                threads=4
            )
            
            clip.close()
            
            if progress_callback:
                progress_callback(1.0, f"转换完成: {output_path}")
                
            return True
            
        except Exception as e:
            if progress_callback:
                progress_callback(0, f"转换失败: {str(e)}")
            print(f"Error converting to WebM: {e}")
            return False
            
    def convert_batch(
        self,
        video_files: List[str],
        output_dir: str,
        output_format: str = "gif",
        start_time: float = 0.0,
        end_time: Optional[float] = None,
        fps: int = 10,
        resolution: Optional[tuple] = None,
        loop: int = 0,
        colors: int = 256,
        bitrate: str = "1M",
        progress_callback: Optional[Callable[[int, int, float, str], None]] = None,
        file_progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> List[Dict[str, Any]]:
        results = []
        total = len(video_files)
        
        for i, video_path in enumerate(video_files):
            if self.stop_event.is_set():
                if progress_callback:
                    progress_callback(i, total, 1.0, "转换已取消")
                break
                
            filename = os.path.basename(video_path)
            name, _ = os.path.splitext(filename)
            output_ext = ".gif" if output_format.lower() == "gif" else ".webm"
            output_path = os.path.join(output_dir, f"{name}{output_ext}")
            
            if progress_callback:
                progress_callback(i, total, 0.0, f"正在处理: {filename}")
                
            success = False
            if output_format.lower() == "gif":
                success = self.convert_to_gif(
                    video_path=video_path,
                    output_path=output_path,
                    start_time=start_time,
                    end_time=end_time,
                    fps=fps,
                    resolution=resolution,
                    loop=loop,
                    colors=colors,
                    progress_callback=file_progress_callback
                )
            else:
                success = self.convert_to_webm(
                    video_path=video_path,
                    output_path=output_path,
                    start_time=start_time,
                    end_time=end_time,
                    fps=fps,
                    resolution=resolution,
                    bitrate=bitrate,
                    progress_callback=file_progress_callback
                )
                
            results.append({
                "input": video_path,
                "output": output_path,
                "success": success
            })
            
            if progress_callback:
                progress_callback(i + 1, total, (i + 1) / total, f"完成: {filename}" if success else f"失败: {filename}")
                
        return results
        
    def stop_conversion(self):
        self.stop_event.set()
        
    def create_preview_frame(
        self,
        video_path: str,
        time: float = 0.0,
        resolution: Optional[tuple] = None
    ) -> Optional[Any]:
        if not MOVIEPY_AVAILABLE or not PIL_AVAILABLE:
            return None
            
        try:
            clip = VideoFileClip(video_path)
            
            if time > clip.duration:
                time = clip.duration
                
            frame = clip.get_frame(time)
            clip.close()
            
            img = Image.fromarray(frame)
            
            if resolution:
                img = img.resize(resolution, Image.Resampling.LANCZOS)
                
            return img
            
        except Exception as e:
            print(f"Error creating preview frame: {e}")
            return None
            
    def save_preview_frame(
        self,
        video_path: str,
        output_path: str,
        time: float = 0.0,
        resolution: Optional[tuple] = None
    ) -> bool:
        img = self.create_preview_frame(video_path, time, resolution)
        if img:
            try:
                img.save(output_path)
                return True
            except Exception as e:
                print(f"Error saving preview frame: {e}")
        return False
