from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Smart Audiobook Notes API is running"}
    print("✓ Root endpoint works")

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
    print("✓ Health endpoint works")

def test_list_audiobooks():
    response = client.get("/api/audiobooks/")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "audiobooks" in data
    print("✓ List audiobooks endpoint works")

if __name__ == "__main__":
    test_root()
    test_health()
    test_list_audiobooks()
    print("\n🎉 All basic API tests passed!")
