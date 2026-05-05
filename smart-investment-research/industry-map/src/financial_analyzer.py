from .config import config
from .company_manager import company_manager
import logging
from statistics import mean, median, stdev

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinancialAnalyzer:
    def __init__(self):
        self.metrics_config = config.FINANCIAL_METRICS
    
    def analyze_company(self, company_id):
        """
        分析单个公司的财务状况
        """
        company = company_manager.get_company_by_id(company_id)
        if not company:
            return None
        
        metrics = company_manager.get_financial_metrics(company_id)
        
        industry = company.get('industry')
        industry_avg = company_manager.get_industry_averages(industry)
        
        analysis = {
            'company': company.get('name'),
            'code': company.get('code'),
            'industry': industry,
            'segment': company.get('segment'),
            'metrics': metrics,
            'industry_comparison': {},
            'valuation_assessment': {}
        }
        
        if industry_avg:
            analysis['industry_comparison'] = {
                'pe_vs_avg': self._calculate_difference(metrics.get('pe'), industry_avg.get('avg_pe')),
                'pb_vs_avg': self._calculate_difference(metrics.get('pb'), industry_avg.get('avg_pb')),
                'roe_vs_avg': self._calculate_difference(metrics.get('roe'), industry_avg.get('avg_roe')),
                'industry_avg_pe': industry_avg.get('avg_pe'),
                'industry_avg_pb': industry_avg.get('avg_pb'),
                'industry_avg_roe': industry_avg.get('avg_roe')
            }
            
            analysis['valuation_assessment'] = self._assess_valuation(metrics, industry_avg)
        
        return analysis
    
    def _calculate_difference(self, value, avg_value):
        """
        计算与平均值的差异百分比
        """
        if not value or not avg_value or avg_value == 0:
            return None
        
        return round(((value - avg_value) / avg_value) * 100, 2)
    
    def _assess_valuation(self, metrics, industry_avg):
        """
        评估公司估值水平
        """
        assessment = {}
        
        pe = metrics.get('pe')
        avg_pe = industry_avg.get('avg_pe')
        
        if pe and avg_pe:
            if pe < avg_pe * 0.8:
                assessment['pe_assessment'] = '低估'
                assessment['pe_level'] = 'low'
            elif pe > avg_pe * 1.2:
                assessment['pe_assessment'] = '高估'
                assessment['pe_level'] = 'high'
            else:
                assessment['pe_assessment'] = '合理'
                assessment['pe_level'] = 'normal'
        
        pb = metrics.get('pb')
        avg_pb = industry_avg.get('avg_pb')
        
        if pb and avg_pb:
            if pb < avg_pb * 0.8:
                assessment['pb_assessment'] = '低估'
                assessment['pb_level'] = 'low'
            elif pb > avg_pb * 1.2:
                assessment['pb_assessment'] = '高估'
                assessment['pb_level'] = 'high'
            else:
                assessment['pb_assessment'] = '合理'
                assessment['pb_level'] = 'normal'
        
        roe = metrics.get('roe')
        avg_roe = industry_avg.get('avg_roe')
        
        if roe and avg_roe:
            if roe > avg_roe * 1.2:
                assessment['roe_assessment'] = '优秀'
                assessment['roe_level'] = 'high'
            elif roe < avg_roe * 0.8:
                assessment['roe_assessment'] = '较差'
                assessment['roe_level'] = 'low'
            else:
                assessment['roe_assessment'] = '一般'
                assessment['roe_level'] = 'normal'
        
        return assessment
    
    def compare_companies(self, company_ids, metrics=['pe', 'pb', 'roe']):
        """
        比较多个公司的财务指标
        """
        comparison = {
            'companies': [],
            'metrics_data': {},
            'summary': {}
        }
        
        for metric in metrics:
            comparison['metrics_data'][metric] = {
                'values': [],
                'avg': 0,
                'median': 0,
                'min': None,
                'max': None
            }
        
        for company_id in company_ids:
            company = company_manager.get_company_by_id(company_id)
            if not company:
                continue
            
            company_data = {
                'id': company_id,
                'name': company.get('name'),
                'code': company.get('code'),
                'metrics': {}
            }
            
            financial_metrics = company_manager.get_financial_metrics(company_id)
            
            for metric in metrics:
                value = financial_metrics.get(metric)
                if value is not None:
                    company_data['metrics'][metric] = value
                    comparison['metrics_data'][metric]['values'].append(value)
                    
                    if (comparison['metrics_data'][metric]['min'] is None or 
                        value < comparison['metrics_data'][metric]['min']):
                        comparison['metrics_data'][metric]['min'] = value
                    
                    if (comparison['metrics_data'][metric]['max'] is None or 
                        value > comparison['metrics_data'][metric]['max']):
                        comparison['metrics_data'][metric]['max'] = value
            
            comparison['companies'].append(company_data)
        
        for metric in metrics:
            values = comparison['metrics_data'][metric]['values']
            if values:
                comparison['metrics_data'][metric]['avg'] = round(mean(values), 2)
                comparison['metrics_data'][metric]['median'] = round(median(values), 2)
                if len(values) > 1:
                    comparison['metrics_data'][metric]['stdev'] = round(stdev(values), 2)
        
        return comparison
    
    def analyze_industry(self, industry):
        """
        分析整个行业的财务状况
        """
        companies = company_manager.get_company_list(industry=industry)
        
        if not companies:
            return None
        
        industry_analysis = {
            'industry': industry,
            'company_count': len(companies),
            'segments': {},
            'metrics_summary': {},
            'top_companies': {}
        }
        
        segment_comparison = company_manager.get_segment_comparison(industry)
        industry_analysis['segments'] = segment_comparison
        
        all_pe = []
        all_pb = []
        all_roe = []
        all_market_cap = []
        
        for company in companies:
            if company.get('pe') is not None:
                all_pe.append(company['pe'])
            if company.get('pb') is not None:
                all_pb.append(company['pb'])
            if company.get('roe') is not None:
                all_roe.append(company['roe'])
            if company.get('market_cap') is not None:
                all_market_cap.append(company['market_cap'])
        
        industry_analysis['metrics_summary'] = {
            'pe': {
                'avg': round(mean(all_pe), 2) if all_pe else None,
                'median': round(median(all_pe), 2) if all_pe else None,
                'min': min(all_pe) if all_pe else None,
                'max': max(all_pe) if all_pe else None
            },
            'pb': {
                'avg': round(mean(all_pb), 2) if all_pb else None,
                'median': round(median(all_pb), 2) if all_pb else None,
                'min': min(all_pb) if all_pb else None,
                'max': max(all_pb) if all_pb else None
            },
            'roe': {
                'avg': round(mean(all_roe), 2) if all_roe else None,
                'median': round(median(all_roe), 2) if all_roe else None,
                'min': min(all_roe) if all_roe else None,
                'max': max(all_roe) if all_roe else None
            },
            'market_cap': {
                'total': sum(all_market_cap) if all_market_cap else None,
                'avg': round(mean(all_market_cap), 2) if all_market_cap else None
            }
        }
        
        sorted_by_pe = sorted(companies, key=lambda x: x.get('pe', float('inf')))
        sorted_by_roe = sorted(companies, key=lambda x: x.get('roe', 0), reverse=True)
        sorted_by_market_cap = sorted(companies, key=lambda x: x.get('market_cap', 0), reverse=True)
        
        industry_analysis['top_companies'] = {
            'lowest_pe': [
                {'name': c.get('name'), 'pe': c.get('pe')} 
                for c in sorted_by_pe[:5] if c.get('pe')
            ],
            'highest_roe': [
                {'name': c.get('name'), 'roe': c.get('roe')} 
                for c in sorted_by_roe[:5] if c.get('roe')
            ],
            'largest_market_cap': [
                {'name': c.get('name'), 'market_cap': c.get('market_cap')} 
                for c in sorted_by_market_cap[:5] if c.get('market_cap')
            ]
        }
        
        return industry_analysis
    
    def generate_valuation_report(self, company_id):
        """
        生成公司估值报告
        """
        analysis = self.analyze_company(company_id)
        if not analysis:
            return None
        
        company = company_manager.get_company_by_id(company_id)
        
        report = {
            'title': f"{analysis['company']} 估值分析报告",
            'generated_at': __import__('datetime').datetime.now().isoformat(),
            'company_overview': {
                'name': analysis['company'],
                'code': analysis['code'],
                'industry': analysis['industry'],
                'segment': analysis['segment']
            },
            'key_metrics': analysis['metrics'],
            'industry_comparison': analysis.get('industry_comparison', {}),
            'valuation_assessment': analysis.get('valuation_assessment', {}),
            'recommendations': self._generate_recommendations(analysis)
        }
        
        return report
    
    def _generate_recommendations(self, analysis):
        """
        根据分析结果生成投资建议
        """
        recommendations = []
        
        valuation = analysis.get('valuation_assessment', {})
        comparison = analysis.get('industry_comparison', {})
        
        pe_assessment = valuation.get('pe_assessment')
        pb_assessment = valuation.get('pb_assessment')
        roe_assessment = valuation.get('roe_assessment')
        
        if pe_assessment == '低估' and roe_assessment in ['优秀', '一般']:
            recommendations.append({
                'type': 'positive',
                'title': '估值具有吸引力',
                'content': f"公司市盈率{analysis['metrics'].get('pe')}x低于行业平均{comparison.get('industry_avg_pe')}x，同时ROE表现{roe_assessment}，估值具有吸引力。"
            })
        elif pe_assessment == '高估' and roe_assessment == '较差':
            recommendations.append({
                'type': 'negative',
                'title': '估值偏高',
                'content': f"公司市盈率{analysis['metrics'].get('pe')}x高于行业平均{comparison.get('industry_avg_pe')}x，同时ROE表现{roe_assessment}，需要注意估值风险。"
            })
        
        if roe_assessment == '优秀':
            recommendations.append({
                'type': 'positive',
                'title': '盈利能力突出',
                'content': f"公司ROE{analysis['metrics'].get('roe')}%显著高于行业平均{comparison.get('industry_avg_roe')}%，盈利能力突出。"
            })
        elif roe_assessment == '较差':
            recommendations.append({
                'type': 'negative',
                'title': '盈利能力待提升',
                'content': f"公司ROE{analysis['metrics'].get('roe')}%低于行业平均{comparison.get('industry_avg_roe')}%，盈利能力有待提升。"
            })
        
        if not recommendations:
            recommendations.append({
                'type': 'neutral',
                'title': '估值合理',
                'content': f"公司当前估值处于合理区间，PE{analysis['metrics'].get('pe')}x、PB{analysis['metrics'].get('pb')}x接近行业平均水平。"
            })
        
        return recommendations

financial_analyzer = FinancialAnalyzer()
