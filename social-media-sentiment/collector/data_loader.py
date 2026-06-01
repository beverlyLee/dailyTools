import pandas as pd
import json
from typing import List, Dict, Optional
from pathlib import Path


class CommentDataLoader:
    def __init__(self, data_dir: str = "../data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def load_from_csv(self, filename: str) -> pd.DataFrame:
        file_path = self.data_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        return pd.read_csv(file_path)

    def load_from_json(self, filename: str) -> pd.DataFrame:
        file_path = self.data_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            return pd.DataFrame(data)
        elif isinstance(data, dict):
            return pd.DataFrame([data])
        else:
            raise ValueError("JSON 数据格式不支持")

    def load_comments(self, filename: str) -> pd.DataFrame:
        if filename.endswith('.csv'):
            return self.load_from_csv(filename)
        elif filename.endswith('.json'):
            return self.load_from_json(filename)
        else:
            raise ValueError(f"不支持的文件格式: {filename}")

    def get_available_files(self) -> List[str]:
        files = []
        for ext in ['*.csv', '*.json']:
            files.extend([f.name for f in self.data_dir.glob(ext)])
        return files

    @staticmethod
    def validate_data(df: pd.DataFrame) -> bool:
        required_columns = ['comment', 'date']
        return all(col in df.columns for col in required_columns)
