import pandas as pd
from typing import List, Dict, Optional
from app.services.nlp_service import NLPService


class AnalyticsService:
    def __init__(self, nlp_service: NLPService):
        self.nlp_service = nlp_service
    
    def get_industry_statistics(self, df: pd.DataFrame, industry: Optional[str] = None) -> Dict:
        if industry and industry != "全部":
            industry_df = df[df['industry'] == industry]
        else:
            industry_df = df
        
        bias_result = self.nlp_service.calculate_age_bias_ratio(industry_df)
        
        return {
            'industry': industry or '全部',
            'total_jobs': bias_result['total_jobs'],
            'has_age_limit_count': bias_result['has_age_limit'],
            'age_limit_ratio': bias_result['age_limit_ratio'],
            'has_35_limit_count': bias_result.get('has_35_limit', 0),
            'limit_35_ratio': bias_result.get('35_limit_ratio', 0),
            'age_categories': bias_result['age_categories']
        }
    
    def get_overall_statistics(self, df: pd.DataFrame, source: Optional[str] = None) -> Dict:
        filtered_df = df
        if source and source != "全部":
            filtered_df = df[df['source'] == source]
        
        industries = filtered_df['industry'].unique()
        industry_comparison = []
        
        for industry in industries:
            stats = self.get_industry_statistics(filtered_df, industry)
            industry_comparison.append(stats)
        
        overall_stats = self.get_industry_statistics(filtered_df)
        
        industry_comparison.sort(key=lambda x: x['age_limit_ratio'], reverse=True)
        
        most_biased = industry_comparison[0]['industry'] if industry_comparison else None
        least_biased = industry_comparison[-1]['industry'] if industry_comparison else None
        
        return {
            'total_jobs': overall_stats['total_jobs'],
            'overall_age_limit_ratio': overall_stats['age_limit_ratio'],
            'industry_comparison': industry_comparison,
            'most_biased_industry': most_biased,
            'least_biased_industry': least_biased,
            'age_categories': overall_stats['age_categories']
        }
    
    def get_funnel_data(self, df: pd.DataFrame, industry: Optional[str] = None) -> Dict:
        filtered_df = df
        if industry and industry != "全行业" and industry != "全部":
            filtered_df = df[df['industry'] == industry]
        
        age_groups = [
            {'name': '22-25岁', 'min_age': 22, 'max_age': 25, 'invitation_rate': 0.85},
            {'name': '26-30岁', 'min_age': 26, 'max_age': 30, 'invitation_rate': 0.75},
            {'name': '31-34岁', 'min_age': 31, 'max_age': 34, 'invitation_rate': 0.55},
            {'name': '35-39岁', 'min_age': 35, 'max_age': 39, 'invitation_rate': 0.25},
            {'name': '40-45岁', 'min_age': 40, 'max_age': 45, 'invitation_rate': 0.10},
            {'name': '45岁以上', 'min_age': 45, 'max_age': 60, 'invitation_rate': 0.05},
        ]
        
        if industry == '互联网':
            age_groups[3]['invitation_rate'] = 0.15
        
        jd_results = self.nlp_service.batch_extract(filtered_df['job_description'].tolist())
        total_candidates = 1000
        
        funnel_data = []
        for group in age_groups:
            excluded_by_jd = sum(1 for r in jd_results 
                                if r['max_age'] and r['max_age'] <= group['min_age'])
            exclusion_rate = excluded_by_jd / len(jd_results) if len(jd_results) > 0 else 0
            
            effective_rate = group['invitation_rate'] * (1 - exclusion_rate * 0.5)
            
            funnel_data.append({
                'age_group': group['name'],
                'candidates': int(total_candidates * effective_rate),
                'invitation_rate': effective_rate,
                'jd_exclusion_rate': exclusion_rate
            })
            
            total_candidates = int(total_candidates * effective_rate)
        
        return {
            'funnel_data': funnel_data,
            'industry': industry or '全行业'
        }
    
    def compare_industries_funnel(self, df: pd.DataFrame) -> Dict:
        industries = df['industry'].unique()
        industry_funnels = {}
        
        for industry in industries:
            industry_funnels[industry] = self.get_funnel_data(df, industry)
        
        return industry_funnels
