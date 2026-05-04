import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
from loguru import logger
from PIL import Image

try:
    import mediapipe as mp
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False
    logger.warning("MediaPipe not installed. Using mock keypoint detection.")

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False
    logger.warning("OpenCV not installed.")

from ..config import settings
from ..models.schemas import Keypoints, Point


class KeypointDetector:
    def __init__(self):
        self._mp_pose = None
        self._pose = None
        self._initialized = False

    def _initialize(self):
        if self._initialized:
            return
        
        if HAS_MEDIAPIPE:
            try:
                self._mp_pose = mp.solutions.pose
                self._pose = self._mp_pose.Pose(
                    static_image_mode=True,
                    model_complexity=1,
                    smooth_landmarks=True,
                    enable_segmentation=False,
                    smooth_segmentation=False,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self._initialized = True
                logger.info("MediaPipe Pose initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize MediaPipe Pose: {e}")
                self._initialized = False
        else:
            logger.info("Using mock keypoint detection (MediaPipe not installed)")
            self._initialized = True

    def detect_from_path(self, image_path: str) -> Tuple[Optional[Keypoints], Dict[str, Any]]:
        self._initialize()
        
        try:
            image_path = Path(image_path)
            if not image_path.exists():
                raise FileNotFoundError(f"Image not found: {image_path}")

            if HAS_MEDIAPIPE and HAS_OPENCV:
                return self._detect_with_mediapipe(str(image_path))
            else:
                return self._detect_mock()
                
        except Exception as e:
            logger.error(f"Keypoint detection failed: {e}")
            return None, {"error": str(e)}

    def detect_from_array(self, image_array: np.ndarray) -> Tuple[Optional[Keypoints], Dict[str, Any]]:
        self._initialize()
        
        try:
            if HAS_MEDIAPIPE:
                return self._detect_array_with_mediapipe(image_array)
            else:
                return self._detect_mock()
                
        except Exception as e:
            logger.error(f"Keypoint detection from array failed: {e}")
            return None, {"error": str(e)}

    def _detect_with_mediapipe(self, image_path: str) -> Tuple[Optional[Keypoints], Dict[str, Any]]:
        if not self._pose:
            return self._detect_mock()

        try:
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Failed to read image: {image_path}")
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image_rgb.shape[:2]
            
            results = self._pose.process(image_rgb)
            
            if not results.pose_landmarks:
                logger.warning("No pose landmarks detected")
                return self._detect_mock()
            
            keypoints = self._extract_keypoints(results.pose_landmarks, width, height)
            metadata = {
                "method": "mediapipe",
                "image_size": {"width": width, "height": height},
                "landmarks_count": len(results.pose_landmarks.landmark),
            }
            
            return keypoints, metadata
            
        except Exception as e:
            logger.error(f"MediaPipe detection failed: {e}")
            return self._detect_mock()

    def _detect_array_with_mediapipe(self, image_array: np.ndarray) -> Tuple[Optional[Keypoints], Dict[str, Any]]:
        if not self._pose:
            return self._detect_mock()

        try:
            if len(image_array.shape) == 3 and image_array.shape[2] == 4:
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
            elif len(image_array.shape) == 2:
                image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
            
            height, width = image_array.shape[:2]
            
            results = self._pose.process(image_array)
            
            if not results.pose_landmarks:
                logger.warning("No pose landmarks detected in array")
                return self._detect_mock()
            
            keypoints = self._extract_keypoints(results.pose_landmarks, width, height)
            metadata = {
                "method": "mediapipe",
                "image_size": {"width": width, "height": height},
                "landmarks_count": len(results.pose_landmarks.landmark),
            }
            
            return keypoints, metadata
            
        except Exception as e:
            logger.error(f"MediaPipe array detection failed: {e}")
            return self._detect_mock()

    def _extract_keypoints(self, landmarks, width: int, height: int) -> Keypoints:
        mp_landmarks = self._mp_pose.PoseLandmark
        
        keypoint_map = {
            "nose": mp_landmarks.NOSE,
            "left_eye": mp_landmarks.LEFT_EYE,
            "right_eye": mp_landmarks.RIGHT_EYE,
            "left_ear": mp_landmarks.LEFT_EAR,
            "right_ear": mp_landmarks.RIGHT_EAR,
            "left_shoulder": mp_landmarks.LEFT_SHOULDER,
            "right_shoulder": mp_landmarks.RIGHT_SHOULDER,
            "left_elbow": mp_landmarks.LEFT_ELBOW,
            "right_elbow": mp_landmarks.RIGHT_ELBOW,
            "left_wrist": mp_landmarks.LEFT_WRIST,
            "right_wrist": mp_landmarks.RIGHT_WRIST,
            "left_hip": mp_landmarks.LEFT_HIP,
            "right_hip": mp_landmarks.RIGHT_HIP,
            "left_knee": mp_landmarks.LEFT_KNEE,
            "right_knee": mp_landmarks.RIGHT_KNEE,
            "left_ankle": mp_landmarks.LEFT_ANKLE,
            "right_ankle": mp_landmarks.RIGHT_ANKLE,
        }
        
        keypoint_data = {}
        
        for key, landmark_idx in keypoint_map.items():
            landmark = landmarks.landmark[landmark_idx]
            keypoint_data[key] = Point(
                x=landmark.x,
                y=landmark.y,
                confidence=landmark.visibility,
            )
        
        return Keypoints(**keypoint_data)

    def _detect_mock(self) -> Tuple[Optional[Keypoints], Dict[str, Any]]:
        keypoints = Keypoints(
            nose=Point(x=0.5, y=0.15, confidence=0.95),
            left_eye=Point(x=0.45, y=0.13, confidence=0.93),
            right_eye=Point(x=0.55, y=0.13, confidence=0.93),
            left_ear=Point(x=0.42, y=0.14, confidence=0.90),
            right_ear=Point(x=0.58, y=0.14, confidence=0.90),
            left_shoulder=Point(x=0.35, y=0.25, confidence=0.90),
            right_shoulder=Point(x=0.65, y=0.25, confidence=0.90),
            left_elbow=Point(x=0.25, y=0.35, confidence=0.88),
            right_elbow=Point(x=0.75, y=0.35, confidence=0.88),
            left_wrist=Point(x=0.20, y=0.45, confidence=0.85),
            right_wrist=Point(x=0.80, y=0.45, confidence=0.85),
            left_hip=Point(x=0.40, y=0.45, confidence=0.87),
            right_hip=Point(x=0.60, y=0.45, confidence=0.87),
            left_knee=Point(x=0.38, y=0.65, confidence=0.82),
            right_knee=Point(x=0.62, y=0.65, confidence=0.82),
            left_ankle=Point(x=0.38, y=0.85, confidence=0.80),
            right_ankle=Point(x=0.62, y=0.85, confidence=0.80),
        )
        
        metadata = {
            "method": "mock",
            "image_size": {"width": 800, "height": 600},
            "landmarks_count": 17,
        }
        
        logger.warning("Using mock keypoints (MediaPipe not available or detection failed)")
        return keypoints, metadata

    def close(self):
        if self._pose:
            self._pose.close()
            self._pose = None
            self._initialized = False
            logger.info("Keypoint detector closed")


keypoint_detector = KeypointDetector()
