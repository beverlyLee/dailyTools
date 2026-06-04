import os
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATA_SOURCE_FILE = DATA_DIR / "data_source.json"


def get_data_path(filename: str) -> Path:
    return DATA_DIR / filename


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def set_data_source(source: str, metadata: dict = None):
    ensure_data_dir()
    data = {
        "source": source,
        "generated_at": None,
        "metadata": metadata or {},
    }
    import datetime
    data["generated_at"] = datetime.datetime.now().isoformat()
    with open(DATA_SOURCE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_data_source() -> dict:
    if not DATA_SOURCE_FILE.exists():
        return {"source": "unknown", "generated_at": None, "metadata": {}}
    with open(DATA_SOURCE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
