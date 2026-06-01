import pandas as pd
import os
from typing import List, Optional, Dict
from pathlib import Path


class DataService:
    def __init__(self, data_file_path: str):
        self.data_file_path = data_file_path
        self._df: Optional[pd.DataFrame] = None
        self._load_data()
    
    def _load_data(self):
        backend_dir = Path(__file__).parent.parent.parent
        full_path = backend_dir / self.data_file_path
        
        if not full_path.exists():
            data_dir = Path(__file__).parent.parent.parent.parent / "data"
            full_path = data_dir / "recruitment_data_500.csv"
            
        if full_path.exists():
            self._df = pd.read_csv(full_path)
        else:
            self._df = pd.DataFrame(columns=[
                'id', 'industry', 'company', 'position', 
                'salary', 'job_description', 'source'
            ])
    
    def get_all_jobs(self, industry: Optional[str] = None, source: Optional[str] = None) -> pd.DataFrame:
        df = self._df.copy()
        
        if industry and industry != "全部":
            df = df[df['industry'] == industry]
        
        if source and source != "全部":
            df = df[df['source'] == source]
        
        return df
    
    def get_job_by_id(self, job_id: int) -> Optional[Dict]:
        job = self._df[self._df['id'] == job_id]
        if len(job) > 0:
            return job.iloc[0].to_dict()
        return None
    
    def get_industries(self) -> List[str]:
        return sorted(self._df['industry'].unique().tolist())
    
    def get_sources(self) -> List[str]:
        return sorted(self._df['source'].unique().tolist())
    
    def get_sample_jobs(self, count: int = 10) -> List[Dict]:
        return self._df.head(count).to_dict('records')
    
    def get_job_descriptions(self) -> List[str]:
        return self._df['job_description'].tolist()
    
    @property
    def df(self) -> pd.DataFrame:
        return self._df.copy()
