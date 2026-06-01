import pandas as pd
from typing import Dict, List
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from src.nlp.age_extractor import calculate_age_bias_ratio, AgeExtractor


class IndustryBiasAnalyzer:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.extractor = AgeExtractor()
        self.industries = ['互联网', '金融', '制造业', '教育', '医疗健康']

    def analyze_by_industry(self, industry_col: str = 'industry', jd_col: str = 'job_description') -> Dict:
        industry_results = {}

        for industry in self.industries:
            industry_df = self.df[self.df[industry_col] == industry]
            if len(industry_df) > 0:
                result = calculate_age_bias_ratio(industry_df, jd_col)
                industry_results[industry] = result

        return industry_results

    def get_funnel_data(self, industry: str = None, industry_col: str = 'industry', jd_col: str = 'job_description') -> Dict:
        df = self.df
        if industry:
            df = df[df[industry_col] == industry]

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

        jd_results = self.extractor.batch_extract(df[jd_col].tolist())
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

    def compare_industries_funnel(self) -> Dict:
        industry_funnels = {}
        for industry in self.industries:
            industry_funnels[industry] = self.get_funnel_data(industry)
        return industry_funnels

    def get_age_crisis_advice(self) -> str:
        advice = """
## 应对35岁年龄危机的建议

### 1. 技能升级策略
- **核心技能深化**：专注成为领域专家，而不是泛泛的通才
- **跨界技能培养**：产品思维 + 技术能力 = 不可替代性
- **学习路径规划**：每年掌握1-2项新技术，保持技术敏感度

### 2. 职业转型方向
- **技术管理岗**：团队管理、项目管理、技术架构
- **产品方向**：技术型产品经理更懂研发痛点
- **自由职业/咨询**：利用多年经验提供专业咨询服务

### 3. 简历优化技巧
- **突出成就而非年龄**：用数据说话，展示业务价值
- **淡化毕业年份**：除非特别优秀，否则避免过早展示教育背景
- **强调持续学习**：证书、在线课程、开源项目贡献

### 4. 面试应对策略
- **主动出击**：提前解释年龄优势：经验、稳定性、领导力
- **展示活力**：展现对新技术的热情和学习能力
- **人脉推荐**：通过内推降低年龄歧视风险

### 5. 长期财务规划
- **多元化收入**：副业、投资、知识产权
- **紧急备用金**：保持6-12个月生活费的现金储备
- **被动收入建设**：尽早布局被动收入渠道

记住：年龄歧视是行业问题，不是你的问题。保持学习能力和心态年轻，你就能在任何年龄段保持竞争力！
        """
        return advice

    def get_statistics_summary(self, industry_col: str = 'industry') -> Dict:
        industry_results = self.analyze_by_industry(industry_col)

        summary = {
            'total_jobs': len(self.df),
            'overall_age_limit_ratio': sum(r['has_age_limit'] for r in industry_results.values()) /
                                       sum(r['total_jobs'] for r in industry_results.values()) * 100,
            'industry_comparison': {},
            'most_biased_industry': None,
            'least_biased_industry': None
        }

        ratios = []
        for industry, result in industry_results.items():
            ratio = result['age_limit_ratio'] * 100
            summary['industry_comparison'][industry] = {
                'age_limit_ratio': ratio,
                '35_limit_ratio': result['35_limit_ratio'] * 100,
                'total_jobs': result['total_jobs']
            }
            ratios.append((industry, ratio))

        if ratios:
            ratios.sort(key=lambda x: x[1], reverse=True)
            summary['most_biased_industry'] = ratios[0]
            summary['least_biased_industry'] = ratios[-1]

        return summary
