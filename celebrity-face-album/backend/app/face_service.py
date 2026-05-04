import face_recognition
import numpy as np
from typing import List, Tuple, Optional, Dict
import cv2
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


class FaceService:
    def __init__(self, tolerance: float = 0.6):
        self.tolerance = tolerance

    def load_image(self, image_path: str) -> np.ndarray:
        return face_recognition.load_image_file(image_path)

    def load_image_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes))
        return np.array(image)

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        face_locations = face_recognition.face_locations(image)
        return face_locations

    def extract_face_encodings(
        self, 
        image: np.ndarray, 
        face_locations: Optional[List[Tuple[int, int, int, int]]] = None
    ) -> List[np.ndarray]:
        if face_locations is None:
            face_locations = self.detect_faces(image)
        
        encodings = face_recognition.face_encodings(image, face_locations)
        return encodings

    def compare_faces(
        self, 
        known_encodings: List[np.ndarray], 
        face_encoding: np.ndarray
    ) -> Tuple[Optional[int], float]:
        if not known_encodings:
            return None, 0.0
        
        matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=self.tolerance)
        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
        
        if len(face_distances) == 0:
            return None, 0.0
        
        best_match_index = np.argmin(face_distances)
        best_similarity = 1.0 - face_distances[best_match_index]
        
        if matches[best_match_index]:
            return best_match_index, best_similarity
        
        return None, best_similarity

    def recognize_face(
        self,
        face_encoding: np.ndarray,
        celebrity_database: List[Dict]
    ) -> Tuple[Optional[Dict], float]:
        if not celebrity_database:
            return None, 0.0
        
        known_encodings = [
            np.frombuffer(celeb['face_encoding'], dtype=np.float64) 
            for celeb in celebrity_database
        ]
        
        match_index, similarity = self.compare_faces(known_encodings, face_encoding)
        
        if match_index is not None:
            return celebrity_database[match_index], similarity
        
        return None, similarity

    def process_image(
        self, 
        image: np.ndarray,
        celebrity_database: Optional[List[Dict]] = None
    ) -> List[Dict]:
        face_locations = self.detect_faces(image)
        face_encodings = self.extract_face_encodings(image, face_locations)
        
        results = []
        
        for idx, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
            top, right, bottom, left = location
            width = right - left
            height = bottom - top
            
            result = {
                'location': {
                    'x': left,
                    'y': top,
                    'width': width,
                    'height': height
                },
                'encoding': encoding.tobytes(),
                'celebrity_id': None,
                'celebrity_name': None,
                'similarity': 0.0
            }
            
            if celebrity_database:
                celebrity, similarity = self.recognize_face(encoding, celebrity_database)
                if celebrity:
                    result['celebrity_id'] = celebrity['id']
                    result['celebrity_name'] = celebrity['name']
                    result['similarity'] = similarity
            
            results.append(result)
        
        return results

    def process_image_from_path(
        self, 
        image_path: str,
        celebrity_database: Optional[List[Dict]] = None
    ) -> List[Dict]:
        image = self.load_image(image_path)
        return self.process_image(image, celebrity_database)

    def process_image_from_bytes(
        self, 
        image_bytes: bytes,
        celebrity_database: Optional[List[Dict]] = None
    ) -> List[Dict]:
        image = self.load_image_from_bytes(image_bytes)
        return self.process_image(image, celebrity_database)

    @staticmethod
    def encoding_to_bytes(encoding: np.ndarray) -> bytes:
        return encoding.tobytes()

    @staticmethod
    def bytes_to_encoding(encoding_bytes: bytes) -> np.ndarray:
        return np.frombuffer(encoding_bytes, dtype=np.float64)


face_service = FaceService()
