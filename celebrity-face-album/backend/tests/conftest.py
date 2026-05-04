import pytest
import os
import tempfile
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from fastapi.testclient import TestClient
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import Base
from app.main import app


@pytest.fixture(scope="function")
def test_db():
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    
    DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        os.close(db_fd)
        os.unlink(db_path)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="function")
def temp_image_path():
    import numpy as np
    from PIL import Image
    import tempfile
    
    img = Image.new('RGB', (200, 200), color='red')
    
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name)
    temp_file.close()
    
    yield temp_file.name
    
    if os.path.exists(temp_file.name):
        os.unlink(temp_file.name)
