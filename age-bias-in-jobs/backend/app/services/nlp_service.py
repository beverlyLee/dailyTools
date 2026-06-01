import re
from typing import List, Dict, Optional
import pandas as pd


class NLPService:
    def __init__(self):
        self.patterns = [
            (r'(\d+)岁以下', 'max', 1),
            (r'(\d+)岁以上', 'min', 1),
            (r'年龄.*?(\d+)-(\d+)岁', 'range', (1, 2)),
            (r'(\d+)-(\d+)岁', 'range', (1, 2)),
            (r'(\d+)后', 'generation', 1),
            (r'80后|90后|00后', 'generation_keyword', 0),
            (r'年龄不超过(\d+)', 'max', 1),
            (r'年龄要求.*?(\d+)至(\d+)', 'range', (1, 2)),
            (r'(\d+)周岁以下', 'max', 1),
            (r'(\d+)周岁以上', 'min', 1),
            (r'应届毕业生|应届生', 'fresh_grad', 0),
            (r'35岁危机|年龄歧视|年龄门槛', 'bias_keyword', 0),
        ]
    
    def extract_age_info(self, text: str) -> Dict:
        result = {
            'has_age_limit': False,
            'min_age': None,
            'max_age': None,
            'generation': None,
            'raw_matches': [],
            'is_fresh_grad': False,
            'age_category': None
        }
        
        text = str(text)
        
        for pattern, ptype, groups in self.patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                result['has_age_limit'] = True
                result['raw_matches'].append(match.group(0))
                
                if ptype == 'max':
                    max_age = int(match.group(groups))
                    if result['max_age'] is None or max_age < result['max_age']:
                        result['max_age'] = max_age
                
                elif ptype == 'min':
                    min_age = int(match.group(groups))
                    if result['min_age'] is None or min_age > result['min_age']:
                        result['min_age'] = min_age
                
                elif ptype == 'range':
                    min_age = int(match.group(groups[0]))
                    max_age = int(match.group(groups[1]))
                    if result['min_age'] is None or min_age > result['min_age']:
                        result['min_age'] = min_age
                    if result['max_age'] is None or max_age < result['max_age']:
                        result['max_age'] = max_age
                
                elif ptype == 'generation':
                    gen = int(match.group(groups))
                    result['generation'] = f"{gen}后"
                    if gen == 90:
                        result['max_age'] = 35
                    elif gen == 80:
                        result['max_age'] = 45
                    elif gen == 0:
                        result['max_age'] = 25
                
                elif ptype == 'generation_keyword':
                    keyword = match.group(0)
                    if '90后' in keyword:
                        result['generation'] = '90后'
                        result['max_age'] = 35
                    elif '80后' in keyword:
                        result['generation'] = '80后'
                        result['max_age'] = 45
                    elif '00后' in keyword:
                        result['generation'] = '00后'
                        result['max_age'] = 25
                
                elif ptype == 'fresh_grad':
                    result['is_fresh_grad'] = True
                    result['max_age'] = 28 if result['max_age'] is None else min(result['max_age'], 28)
        
        result['age_category'] = self._get_age_category(result['max_age'])
        
        return result
    
    def _get_age_category(self, max_age: Optional[int]) -> str:
        if max_age is None:
            return '无年龄限制'
        elif max_age <= 25:
            return '25岁以下'
        elif max_age <= 30:
            return '30岁以下'
        elif max_age <= 35:
            return '35岁以下'
        elif max_age <= 40:
            return '40岁以下'
        else:
            return '40岁以上'
    
    def batch_extract(self, texts: List[str]) -> List[Dict]:
        return [self.extract_age_info(text) for text in texts]
    
    def calculate_age_bias_ratio(self, df: pd.DataFrame, jd_column: str = 'job_description') -> Dict:
        results = self.batch_extract(df[jd_column].tolist())
        
        total = len(results)
        has_limit = sum(1 for r in results if r['has_age_limit'])
        has_35_limit = sum(1 for r in results if r['max_age'] and r['max_age'] <= 35)
        
        categories = {}
        for r in results:
            cat = r['age_category']
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            'total_jobs': total,
            'has_age_limit': has_limit,
            'age_limit_ratio': has_limit / total if total > 0 else 0,
            'has_35_limit': has_35_limit,
            '35_limit_ratio': has_35_limit / total if total > 0 else 0,
            'age_categories': categories,
            'details': results
        }
