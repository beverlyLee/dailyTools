import os
import tempfile
from datetime import datetime
from PyQt6.QtCore import QThread, pyqtSignal, QObject, Qt
from PyQt6.QtGui import QImage, QPixmap

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from moviepy.editor import VideoFileClip
    HAS_MOVIEPY = True
except ImportError:
    HAS_MOVIEPY = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

class ConversionTask:
    def __init__(self, input_path, output_path, params):
        self.input_path = input_path
        self.output_path = output_path
        self.params = params
        self.status = 'pending'
        self.progress = 0
        self.error = None
        self.start_time = None
        self.end_time = None

class ConverterWorker(QThread):
    progress_updated = pyqtSignal(float, str)
    conversion_finished = pyqtSignal(bool, str)
    frame_ready = pyqtSignal(object)
    
    def __init__(self, task):
        super().__init__()
        self.task = task
        self.is_cancelled = False
    
    def run(self):
        if not HAS_MOVIEPY:
            self.task.status = 'error'
            self.task.error = 'moviepy 未安装，请运行: pip install moviepy'
            self.conversion_finished.emit(False, self.task.error)
            return
        
        try:
            self.task.start_time = datetime.now()
            self.task.status = 'running'
            
            params = self.task.params
            input_path = self.task.input_path
            output_path = self.task.output_path
            
            clip = VideoFileClip(input_path)
            
            start_time = params.get('start_time', 0)
            end_time = params.get('end_time', clip.duration)
            
            if start_time > 0 or end_time < clip.duration:
                clip = clip.subclip(start_time, end_time)
            
            width = params.get('width')
            height = params.get('height')
            if width or height:
                clip = clip.resize(newsize=(width, height) if width and height else None,
                                   width=width, height=height)
            
            fps = params.get('fps', 10)
            loop = params.get('loop', 0)
            colors = params.get('colors', 256)
            optimize = params.get('optimize', True)
            fuzz = params.get('fuzz', 2)
            
            output_format = params.get('format', 'gif').lower()
            
            def progress_callback(t):
                if self.is_cancelled:
                    return
                progress = (t / clip.duration) * 100
                self.task.progress = progress
                self.progress_updated.emit(progress, os.path.basename(input_path))
            
            if output_format == 'gif':
                clip.write_gif(
                    output_path,
                    fps=fps,
                    program='ffmpeg' if params.get('use_ffmpeg', True) else 'imageio',
                    opt=optimize,
                    fuzz=fuzz,
                    colors=colors,
                    loop=loop if loop >= 0 else None,
                    progress_bar=False
                )
            elif output_format == 'webm':
                clip.write_videofile(
                    output_path,
                    fps=fps,
                    codec='libvpx-vp9',
                    audio_codec='libvorbis',
                    progress_bar=False
                )
            elif output_format == 'mp4':
                clip.write_videofile(
                    output_path,
                    fps=fps,
                    codec='libx264',
                    audio_codec='aac',
                    progress_bar=False
                )
            
            clip.close()
            
            self.task.status = 'completed'
            self.task.end_time = datetime.now()
            self.task.progress = 100
            self.progress_updated.emit(100, os.path.basename(input_path))
            self.conversion_finished.emit(True, output_path)
            
        except Exception as e:
            self.task.status = 'error'
            self.task.error = str(e)
            self.conversion_finished.emit(False, str(e))
    
    def cancel(self):
        self.is_cancelled = True

class PreviewWorker(QThread):
    frame_ready = pyqtSignal(object)
    
    def __init__(self, video_path, params):
        super().__init__()
        self.video_path = video_path
        self.params = params
        self.is_cancelled = False
    
    def run(self):
        if not HAS_MOVIEPY:
            return
        
        try:
            clip = VideoFileClip(self.video_path)
            
            start_time = self.params.get('start_time', 0)
            end_time = self.params.get('end_time', clip.duration)
            
            if start_time > 0 or end_time < clip.duration:
                clip = clip.subclip(start_time, end_time)
            
            width = self.params.get('width')
            height = self.params.get('height')
            if width or height:
                clip = clip.resize(newsize=(width, height) if width and height else None,
                                   width=width, height=height)
            
            fps = self.params.get('fps', 10)
            
            for frame in clip.iter_frames(fps=fps, dtype='uint8'):
                if self.is_cancelled:
                    break
                self.frame_ready.emit(frame)
                self.msleep(int(1000 / fps))
            
            clip.close()
            
        except Exception as e:
            print(f"Preview error: {e}")
    
    def cancel(self):
        self.is_cancelled = True

class VideoConverter(QObject):
    progress_updated = pyqtSignal(float, str)
    conversion_finished = pyqtSignal(bool, str)
    preview_frame_ready = pyqtSignal(object)
    
    def __init__(self):
        super().__init__()
        self.tasks = []
        self.current_worker = None
        self.preview_worker = None
    
    def get_video_info(self, video_path):
        if not HAS_MOVIEPY:
            return None
        
        try:
            clip = VideoFileClip(video_path)
            info = {
                'duration': clip.duration,
                'fps': clip.fps,
                'size': clip.size,
                'width': clip.size[0],
                'height': clip.size[1],
                'has_audio': clip.audio is not None,
                'filename': os.path.basename(video_path),
                'filesize': os.path.getsize(video_path)
            }
            clip.close()
            return info
        except Exception as e:
            print(f"Error getting video info: {e}")
            return None
    
    def create_task(self, input_path, output_dir=None, params=None):
        if params is None:
            params = {}
        
        if output_dir is None:
            output_dir = os.path.dirname(input_path)
        
        output_format = params.get('format', 'gif').lower()
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_path = os.path.join(output_dir, f"{base_name}.{output_format}")
        
        task = ConversionTask(input_path, output_path, params)
        self.tasks.append(task)
        return task
    
    def start_conversion(self, task):
        if self.current_worker and self.current_worker.isRunning():
            return False
        
        self.current_worker = ConverterWorker(task)
        self.current_worker.progress_updated.connect(self._on_progress)
        self.current_worker.conversion_finished.connect(self._on_finished)
        self.current_worker.start()
        return True
    
    def start_batch_conversion(self, tasks):
        for task in tasks:
            if not self.start_conversion(task):
                return False
        return True
    
    def cancel_conversion(self):
        if self.current_worker and self.current_worker.isRunning():
            self.current_worker.cancel()
            self.current_worker.wait()
    
    def start_preview(self, video_path, params=None):
        if params is None:
            params = {}
        
        if self.preview_worker and self.preview_worker.isRunning():
            self.preview_worker.cancel()
            self.preview_worker.wait()
        
        self.preview_worker = PreviewWorker(video_path, params)
        self.preview_worker.frame_ready.connect(self._on_preview_frame)
        self.preview_worker.start()
    
    def stop_preview(self):
        if self.preview_worker and self.preview_worker.isRunning():
            self.preview_worker.cancel()
            self.preview_worker.wait()
    
    def _on_progress(self, progress, filename):
        self.progress_updated.emit(progress, filename)
    
    def _on_finished(self, success, message):
        self.conversion_finished.emit(success, message)
    
    def _on_preview_frame(self, frame):
        self.preview_frame_ready.emit(frame)
    
    def get_pending_tasks(self):
        return [t for t in self.tasks if t.status == 'pending']
    
    def get_running_tasks(self):
        return [t for t in self.tasks if t.status == 'running']
    
    def get_completed_tasks(self):
        return [t for t in self.tasks if t.status == 'completed']
    
    def get_failed_tasks(self):
        return [t for t in self.tasks if t.status == 'error']
    
    def clear_tasks(self):
        self.cancel_conversion()
        self.tasks.clear()
