import pytest
import numpy as np
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.face_service import FaceService, face_service


class TestFaceService:
    
    def test_initialization(self):
        service = FaceService(tolerance=0.5)
        assert service.tolerance == 0.5
        
        default_service = FaceService()
        assert default_service.tolerance == 0.6
    
    def test_encoding_conversion(self):
        encoding = np.random.rand(128).astype(np.float64)
        
        encoding_bytes = FaceService.encoding_to_bytes(encoding)
        assert isinstance(encoding_bytes, bytes)
        
        decoded_encoding = FaceService.bytes_to_encoding(encoding_bytes)
        assert isinstance(decoded_encoding, np.ndarray)
        assert decoded_encoding.shape == encoding.shape
        np.testing.assert_array_almost_equal(decoded_encoding, encoding)
    
    def test_compare_faces_empty_database(self):
        service = FaceService()
        face_encoding = np.random.rand(128).astype(np.float64)
        
        match_index, similarity = service.compare_faces([], face_encoding)
        assert match_index is None
        assert similarity == 0.0
    
    def test_compare_faces_same_encoding(self):
        service = FaceService(tolerance=0.6)
        
        known_encoding = np.random.rand(128).astype(np.float64)
        test_encoding = known_encoding.copy()
        
        match_index, similarity = service.compare_faces([known_encoding], test_encoding)
        
        assert match_index == 0
        assert similarity > 0.9
    
    def test_compare_faces_different_encodings(self):
        service = FaceService(tolerance=0.3)
        
        known_encoding = np.zeros(128, dtype=np.float64)
        test_encoding = np.ones(128, dtype=np.float64)
        
        match_index, similarity = service.compare_faces([known_encoding], test_encoding)
        
        assert match_index is None
        assert similarity < 0.5
    
    def test_recognize_face_empty_database(self):
        service = FaceService()
        face_encoding = np.random.rand(128).astype(np.float64)
        
        celebrity, similarity = service.recognize_face(face_encoding, [])
        assert celebrity is None
        assert similarity == 0.0
    
    def test_recognize_face_match(self):
        service = FaceService(tolerance=0.6)
        
        test_encoding = np.random.rand(128).astype(np.float64)
        
        celebrity_database = [
            {
                'id': 1,
                'name': 'Test Celebrity',
                'face_encoding': test_encoding.tobytes()
            }
        ]
        
        celebrity, similarity = service.recognize_face(test_encoding, celebrity_database)
        
        assert celebrity is not None
        assert celebrity['id'] == 1
        assert celebrity['name'] == 'Test Celebrity'
        assert similarity > 0.9
    
    def test_face_service_singleton(self):
        assert face_service is not None
        assert isinstance(face_service, FaceService)
    
    def test_load_image_from_bytes(self):
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = img_bytes.read()
        
        loaded_image = face_service.load_image_from_bytes(image_data)
        
        assert isinstance(loaded_image, np.ndarray)
        assert loaded_image.shape == (100, 100, 3)
    
    def test_detect_faces_no_face(self):
        from PIL import Image
        import io
        
        img = Image.new('RGB', (200, 200), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = img_bytes.read()
        
        image = face_service.load_image_from_bytes(image_data)
        face_locations = face_service.detect_faces(image)
        
        assert isinstance(face_locations, list)
    
    def test_extract_face_encodings_no_face(self):
        from PIL import Image
        import io
        
        img = Image.new('RGB', (200, 200), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = img_bytes.read()
        
        image = face_service.load_image_from_bytes(image_data)
        encodings = face_service.extract_face_encodings(image)
        
        assert isinstance(encodings, list)
        assert len(encodings) == 0
    
    def test_process_image_no_face(self):
        from PIL import Image
        import io
        
        img = Image.new('RGB', (200, 200), color='purple')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        image_data = img_bytes.read()
        
        image = face_service.load_image_from_bytes(image_data)
        results = face_service.process_image(image)
        
        assert isinstance(results, list)
        assert len(results) == 0


class TestFaceEncodingOperations:
    
    def test_encoding_shape(self):
        encoding = np.random.rand(128).astype(np.float64)
        assert encoding.shape == (128,)
    
    def test_encoding_dtype(self):
        encoding = np.random.rand(128).astype(np.float64)
        assert encoding.dtype == np.float64
    
    def test_encoding_bytes_roundtrip(self):
        original = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float64)
        
        encoded = FaceService.encoding_to_bytes(original)
        decoded = FaceService.bytes_to_encoding(encoded)
        
        np.testing.assert_array_equal(original, decoded)


class TestFaceComparison:
    
    def test_similarity_range(self):
        service = FaceService()
        
        encoding1 = np.random.rand(128).astype(np.float64)
        encoding2 = np.random.rand(128).astype(np.float64)
        
        _, similarity = service.compare_faces([encoding1], encoding2)
        
        assert 0.0 <= similarity <= 1.0
    
    def test_identical_encodings_high_similarity(self):
        service = FaceService()
        
        encoding = np.random.rand(128).astype(np.float64)
        
        _, similarity = service.compare_faces([encoding], encoding.copy())
        
        assert similarity > 0.95
    
    def test_multiple_known_encodings(self):
        service = FaceService(tolerance=0.6)
        
        encodings = [
            np.random.rand(128).astype(np.float64),
            np.random.rand(128).astype(np.float64),
            np.random.rand(128).astype(np.float64),
        ]
        
        test_encoding = encodings[1].copy()
        
        match_index, similarity = service.compare_faces(encodings, test_encoding)
        
        assert match_index == 1
        assert similarity > 0.9
