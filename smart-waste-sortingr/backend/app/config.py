import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

DATABASE_URL = f"sqlite:///{DATA_DIR / 'waste_sorting.db'}"

MODEL_PATH = MODELS_DIR / "waste_classifier.onnx"
KNOWLEDGE_BASE_PATH = DATA_DIR / "waste_knowledge.json"

DEVICE = "cpu"
IMAGE_SIZE = (224, 224)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
