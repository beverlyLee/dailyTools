import os
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import uuid
from app.config import settings
from app.services.video_processor import video_processor


class KeyframeExtractor:
    def __init__(self):
        self.threshold = settings.KEYFRAME_THRESHOLD
        self.max_keyframes = settings.MAX_KEYFRAMES
    
    def calculate_histogram_difference(self, hist1: np.ndarray, hist2: np.ndarray) -> float:
        return cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA)
    
    def extract_frame_histogram(self, frame: np.ndarray) -> np.ndarray:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [50, 60, 60], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
        return hist
    
    def detect_scenes(
        self, 
        video_path: str, 
        sample_interval: int = 10
    ) -> List[Tuple[float, int, float]]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"无法打开视频文件: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        scene_changes = []
        prev_hist = None
        prev_frame_num = 0
        
        frame_num = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_num % sample_interval == 0:
                current_hist = self.extract_frame_histogram(frame)
                
                if prev_hist is not None:
                    diff = self.calculate_histogram_difference(prev_hist, current_hist)
                    
                    if diff > self.threshold:
                        timestamp = frame_num / fps
                        scene_changes.append((timestamp, frame_num, diff))
                
                prev_hist = current_hist
                prev_frame_num = frame_num
            
            frame_num += 1
        
        cap.release()
        
        return scene_changes
    
    def extract_keyframes(
        self, 
        video_path: str, 
        output_dir: str,
        transcript_segments: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        os.makedirs(output_dir, exist_ok=True)
        
        keyframes = []
        
        scene_changes = self.detect_scenes(video_path)
        
        keyframe_timestamps = set()
        for timestamp, frame_num, score in scene_changes:
            keyframe_timestamps.add((timestamp, frame_num, "scene", score))
        
        if transcript_segments:
            for segment in transcript_segments:
                start_time = segment["start_time"]
                keyframe_timestamps.add((start_time, int(start_time * 30), "transcript", 1.0))
        
        sorted_keyframes = sorted(keyframe_timestamps, key=lambda x: x[0])
        
        if len(sorted_keyframes) > self.max_keyframes:
            step = len(sorted_keyframes) // self.max_keyframes
            sorted_keyframes = sorted_keyframes[::step]
        
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        for timestamp, frame_num, keyframe_type, score in sorted_keyframes:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if ret:
                output_filename = f"keyframe_{uuid.uuid4()}.jpg"
                output_path = os.path.join(output_dir, output_filename)
                
                cv2.imwrite(output_path, frame)
                
                keyframes.append({
                    "timestamp": timestamp,
                    "frame_number": frame_num,
                    "frame_path": output_path,
                    "type": keyframe_type,
                    "similarity_score": score,
                })
        
        cap.release()
        
        return keyframes
    
    def extract_keyframes_simple(
        self,
        video_path: str,
        output_dir: str,
        num_keyframes: int = 10
    ) -> List[Dict[str, Any]]:
        os.makedirs(output_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"无法打开视频文件: {video_path}")
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        interval = max(1, total_frames // num_keyframes)
        
        keyframes = []
        
        for i in range(num_keyframes):
            frame_num = min(i * interval, total_frames - 1)
            timestamp = frame_num / fps
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            
            if ret:
                output_filename = f"keyframe_{uuid.uuid4()}.jpg"
                output_path = os.path.join(output_dir, output_filename)
                
                cv2.imwrite(output_path, frame)
                
                keyframes.append({
                    "timestamp": timestamp,
                    "frame_number": frame_num,
                    "frame_path": output_path,
                    "type": "uniform",
                    "similarity_score": 0.0,
                })
        
        cap.release()
        
        return keyframes


keyframe_extractor = KeyframeExtractor()
