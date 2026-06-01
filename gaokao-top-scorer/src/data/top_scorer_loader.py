import pandas as pd
import os
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class TopScorer:
    year: int
    province: str
    name: str
    school: str
    major: str
    category: str


class TopScorerLoader:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
        self.data_dir = data_dir
        self.data: Optional[pd.DataFrame] = None

    def load_data(self, filename: str = 'top_scorers.csv') -> pd.DataFrame:
        file_path = os.path.join(self.data_dir, filename)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        self.data = pd.read_csv(file_path)
        self._clean_data()
        return self.data

    def _clean_data(self):
        if self.data is None:
            return
        
        self.data['year'] = self.data['year'].astype(int)
        self.data['province'] = self.data['province'].str.strip()
        self.data['school'] = self.data['school'].str.strip()
        self.data['major'] = self.data['major'].str.strip()
        self.data['category'] = self.data['category'].str.strip()
        
        self.data['major_category'] = self.data['major'].apply(self._classify_major)

    @staticmethod
    def _classify_major(major: str) -> str:
        major_lower = major.lower()
        
        cs_keywords = ['计算机', '软件', '人工智能', '数据', '信息', '电子', '自动化', 'cs', 'computer']
        if any(k in major_lower for k in cs_keywords):
            return '计算机类'
        
        econ_keywords = ['经济', '管理', '金融', '会计', '工商', '商学', 'econ', 'business']
        if any(k in major_lower for k in econ_keywords):
            return '经管类'
        
        med_keywords = ['医学', '临床', '口腔', '基础医学', 'medicine']
        if any(k in major_lower for k in med_keywords):
            return '医学类'
        
        eng_keywords = ['工程', '机械', '土木', '建筑', '材料', '能源', 'engineering']
        if any(k in major_lower for k in eng_keywords):
            return '工科类'
        
        sci_keywords = ['数学', '物理', '化学', '生物', '科学', 'science']
        if any(k in major_lower for k in sci_keywords):
            return '理科类'
        
        law_keywords = ['法学', '法律', 'law']
        if any(k in major_lower for k in law_keywords):
            return '法学类'
        
        return '其他'

    def get_provinces(self) -> List[str]:
        if self.data is None:
            return []
        return sorted(self.data['province'].unique().tolist())

    def get_years(self) -> List[int]:
        if self.data is None:
            return []
        return sorted(self.data['year'].unique().tolist())

    def get_schools(self) -> List[str]:
        if self.data is None:
            return []
        return sorted(self.data['school'].unique().tolist())

    def filter_by_province(self, province: str) -> pd.DataFrame:
        if self.data is None:
            return pd.DataFrame()
        return self.data[self.data['province'] == province]

    def filter_by_year(self, year: int) -> pd.DataFrame:
        if self.data is None:
            return pd.DataFrame()
        return self.data[self.data['year'] == year]

    def filter_by_school(self, school: str) -> pd.DataFrame:
        if self.data is None:
            return pd.DataFrame()
        return self.data[self.data['school'] == school]

    def get_statistics(self) -> Dict:
        if self.data is None:
            return {}
        
        return {
            'total_count': len(self.data),
            'year_range': [self.data['year'].min(), self.data['year'].max()],
            'province_count': self.data['province'].nunique(),
            'school_count': self.data['school'].nunique(),
            'by_category': self.data['major_category'].value_counts().to_dict()
        }
