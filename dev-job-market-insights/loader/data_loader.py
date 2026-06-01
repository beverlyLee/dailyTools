import json
import csv
import os
from typing import List, Dict, Any


class DataLoader:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.data_source = "fallback"

    def load_json(self, filename: str) -> List[Dict[str, Any]]:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return self._normalize_data(data)

    def load_csv(self, filename: str) -> List[Dict[str, Any]]:
        filepath = os.path.join(self.data_dir, filename)
        data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return self._normalize_data(data)

    def _normalize_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for item in data:
            normalized_item = {
                'job_title': self._get_field(item, ['job_title', '职位名称', 'title']),
                'company': self._get_field(item, ['company', '公司名称', 'company_name']),
                'salary': self._parse_salary(self._get_field(item, ['salary', '薪资', '工资'])),
                'location': self._get_field(item, ['location', '地点', '工作地点']),
                'description': self._get_field(item, ['description', '职位描述', 'job_description', 'desc']),
                'requirements': self._get_field(item, ['requirements', '要求', '任职要求'])
            }
            normalized.append(normalized_item)
        return normalized

    def _get_field(self, item: Dict[str, Any], possible_keys: List[str]) -> str:
        for key in possible_keys:
            if key in item and item[key]:
                return str(item[key])
        return ''

    def _parse_salary(self, salary_str: str) -> Dict[str, float]:
        if not salary_str:
            return {'min': 0, 'max': 0, 'avg': 0}
        try:
            salary_str = salary_str.replace('K', '000').replace('k', '000')
            salary_str = salary_str.replace('万', '0000')
            if '-' in salary_str:
                parts = salary_str.split('-')
                min_salary = float(''.join(filter(str.isdigit, parts[0])))
                max_salary = float(''.join(filter(str.isdigit, parts[1])))
                avg_salary = (min_salary + max_salary) / 2
                return {'min': min_salary, 'max': max_salary, 'avg': avg_salary}
            else:
                salary = float(''.join(filter(str.isdigit, salary_str)))
                return {'min': salary, 'max': salary, 'avg': salary}
        except:
            return {'min': 0, 'max': 0, 'avg': 0}

    def load_real_data(self) -> List[Dict[str, Any]]:
        real_data_files = ['real_jobs.json', 'real_jobs.csv']
        for filename in real_data_files:
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                try:
                    if filename.endswith('.json'):
                        data = self.load_json(filename)
                        if data:
                            self.data_source = "real"
                            return data
                    elif filename.endswith('.csv'):
                        data = self.load_csv(filename)
                        if data:
                            self.data_source = "real"
                            return data
                except Exception as e:
                    print(f"Error loading real data {filename}: {e}")
        return []

    def load_fallback_data(self) -> List[Dict[str, Any]]:
        fallback_files = ['jobs.json', 'jobs.csv']
        for filename in fallback_files:
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                try:
                    if filename.endswith('.json'):
                        data = self.load_json(filename)
                        if data:
                            self.data_source = "fallback"
                            return data
                    elif filename.endswith('.csv'):
                        data = self.load_csv(filename)
                        if data:
                            self.data_source = "fallback"
                            return data
                except Exception as e:
                    print(f"Error loading fallback data {filename}: {e}")
        return []

    def load_all_data(self) -> List[Dict[str, Any]]:
        real_data = self.load_real_data()
        if real_data:
            print(f"✅ 已加载真实数据源，共 {len(real_data)} 条招聘数据")
            return real_data
        
        fallback_data = self.load_fallback_data()
        if fallback_data:
            print(f"⚠️  真实数据不可用，使用模拟数据，共 {len(fallback_data)} 条")
            return fallback_data
        
        print("❌ 无可用数据")
        return []

    def get_data_source(self) -> str:
        return self.data_source
