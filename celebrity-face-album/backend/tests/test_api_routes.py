import pytest
from pathlib import Path
import sys
import io
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestRootRoutes:
    
    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "docs" in data
    
    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_stats_endpoint(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "photos" in data
        assert "celebrities" in data
        assert "detections" in data
        assert "recognized" in data
        assert "recent_photos" in data


class TestPhotoRoutes:
    
    def test_get_photos_empty(self, client):
        response = client.get("/api/photos")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "photos" in data
        assert isinstance(data["photos"], list)
    
    def test_get_photos_with_pagination(self, client):
        response = client.get("/api/photos?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 0
    
    def test_get_photo_not_found(self, client):
        response = client.get("/api/photos/999999")
        assert response.status_code == 404
    
    def test_delete_photo_not_found(self, client):
        response = client.delete("/api/photos/999999")
        assert response.status_code == 404


class TestCelebrityRoutes:
    
    def test_get_celebrities_empty(self, client):
        response = client.get("/api/celebrities")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "celebrities" in data
        assert isinstance(data["celebrities"], list)
    
    def test_get_celebrities_with_pagination(self, client):
        response = client.get("/api/celebrities?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 0
    
    def test_get_celebrity_not_found(self, client):
        response = client.get("/api/celebrities/999999")
        assert response.status_code == 404


class TestPhotoUpload:
    
    def create_test_image(self):
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_upload_non_image_file(self, client):
        response = client.post(
            "/api/photos/upload",
            files={"file": ("test.txt", b"not an image", "text/plain")}
        )
        assert response.status_code == 400
        assert "图片" in response.json()["detail"] or "image" in response.json()["detail"].lower()


class TestPagination:
    
    def test_photos_pagination_params(self, client):
        response = client.get("/api/photos?limit=50&offset=10")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 50
        assert data["offset"] == 10
    
    def test_celebrities_pagination_params(self, client):
        response = client.get("/api/celebrities?limit=50&offset=10")
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 50
        assert data["offset"] == 10
    
    def test_invalid_limit_param(self, client):
        response = client.get("/api/photos?limit=200")
        assert response.status_code == 422
    
    def test_invalid_offset_param(self, client):
        response = client.get("/api/photos?offset=-1")
        assert response.status_code == 422


class TestStatsData:
    
    def test_stats_initial_state(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["photos"] >= 0
        assert data["celebrities"] >= 0
        assert data["detections"] >= 0
        assert data["recognized"] >= 0
        assert isinstance(data["recent_photos"], list)
    
    def test_stats_types(self, client):
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["photos"], int)
        assert isinstance(data["celebrities"], int)
        assert isinstance(data["detections"], int)
        assert isinstance(data["recognized"], int)


class TestCORS:
    
    def test_cors_headers(self, client):
        response = client.options("/api/stats")
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert response.headers["access-control-allow-origin"] == "*"
