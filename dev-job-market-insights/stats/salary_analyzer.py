import numpy as np
from typing import List, Dict, Any, Tuple
from collections import defaultdict


class SalaryAnalyzer:
    def __init__(self):
        pass

    def calculate_median_salary(self, jobs: List[Dict[str, Any]]) -> float:
        salaries = [job['salary']['avg'] for job in jobs if job['salary']['avg'] > 0]
        if not salaries:
            return 0
        return float(np.median(salaries))

    def calculate_average_salary(self, jobs: List[Dict[str, Any]]) -> float:
        salaries = [job['salary']['avg'] for job in jobs if job['salary']['avg'] > 0]
        if not salaries:
            return 0
        return float(np.mean(salaries))

    def analyze_tech_salaries(self, jobs: List[Dict[str, Any]], 
                               tech_terms: List[str]) -> Dict[str, Dict[str, Any]]:
        tech_salaries = defaultdict(list)
        
        for job in jobs:
            if job['salary']['avg'] == 0:
                continue
            text = job['description'] + ' ' + job.get('requirements', '')
            text_lower = text.lower()
            
            for tech in tech_terms:
                if tech.lower() in text_lower:
                    tech_salaries[tech].append(job['salary']['avg'])
        
        results = {}
        for tech, salaries in tech_salaries.items():
            if len(salaries) >= 3:
                results[tech] = {
                    'count': len(salaries),
                    'median': float(np.median(salaries)),
                    'average': float(np.mean(salaries)),
                    'min': float(np.min(salaries)),
                    'max': float(np.max(salaries))
                }
        
        return dict(sorted(results.items(), key=lambda x: x[1]['median'], reverse=True))

    def analyze_job_title_salaries(self, jobs: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        job_categories = {
            '算法工程师': ['算法', '算法工程师', '机器学习', '深度学习'],
            '测试工程师': ['测试', '测试工程师', 'QA', '质量保证'],
            '前端工程师': ['前端', '前端工程师', 'Vue', 'React', 'JavaScript'],
            '后端工程师': ['后端', '后端工程师', 'Java', 'Python', 'Go'],
            '全栈工程师': ['全栈', '全栈工程师'],
            '数据工程师': ['数据', '数据工程师', '大数据', '数据分析'],
            '运维工程师': ['运维', '运维工程师', 'DevOps', 'SRE'],
            '产品经理': ['产品', '产品经理', 'PM']
        }
        
        results = {}
        for category, keywords in job_categories.items():
            category_jobs = []
            for job in jobs:
                if job['salary']['avg'] == 0:
                    continue
                title = job['job_title']
                desc = job['description']
                text = (title + ' ' + desc).lower()
                if any(kw.lower() in text for kw in keywords):
                    category_jobs.append(job['salary']['avg'])
            
            if len(category_jobs) >= 1:
                results[category] = {
                    'count': len(category_jobs),
                    'median': float(np.median(category_jobs)),
                    'average': float(np.mean(category_jobs)),
                    'min': float(np.min(category_jobs)),
                    'max': float(np.max(category_jobs))
                }
        
        return dict(sorted(results.items(), key=lambda x: x[1]['median'], reverse=True))

    def get_salary_distribution(self, jobs: List[Dict[str, Any]]) -> Dict[str, int]:
        salaries = [job['salary']['avg'] for job in jobs if job['salary']['avg'] > 0]
        if not salaries:
            return {}
        
        bins = [0, 10000, 20000, 30000, 40000, 50000, 100000]
        labels = ['10K以下', '10K-20K', '20K-30K', '30K-40K', '40K-50K', '50K以上']
        
        distribution = defaultdict(int)
        for salary in salaries:
            for i in range(len(bins) - 1):
                if bins[i] <= salary < bins[i + 1]:
                    distribution[labels[i]] += 1
                    break
        
        return dict(distribution)
