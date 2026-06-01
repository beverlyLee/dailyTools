import json
import os
from datetime import datetime
from typing import List, Dict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def get_file_path(date_str: str = None) -> str:
    ensure_data_dir()
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    return os.path.join(DATA_DIR, f"trending_{date_str}.json")

def save_trending_data(repos: List[Dict]) -> str:
    ensure_data_dir()
    date_str = datetime.now().strftime("%Y-%m-%d")
    file_path = get_file_path(date_str)
    
    data = {
        "date": date_str,
        "fetched_at": datetime.now().isoformat(),
        "repos": repos
    }
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return date_str

def load_trending_data(date_str: str = None) -> Dict:
    file_path = get_file_path(date_str)
    
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_available_dates() -> List[str]:
    ensure_data_dir()
    dates = []
    
    for filename in os.listdir(DATA_DIR):
        if filename.startswith("trending_") and filename.endswith(".json"):
            date_str = filename.replace("trending_", "").replace(".json", "")
            dates.append(date_str)
    
    dates.sort(reverse=True)
    return dates
