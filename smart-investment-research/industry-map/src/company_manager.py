from .config import config
import logging
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompanyManager:
    def __init__(self):
        self.company_data = config.COMPANY_DATA
        self.additional_companies = self._generate_additional_companies()
    
    def _generate_additional_companies(self):
        """
        生成更多示例公司数据
        """
        companies = {
            '特斯拉': {
                'id': '3',
                'name': '特斯拉',
                'code': 'TSLA',
                'industry': '新能源',
                'segment': '下游',
                'market_cap': 15000,
                'pe': 45.8,
                'pb': 12.3,
                'roe': 25.8,
                'eps': 15.2,
                'revenue': '9800.0亿',
                'profit': '1200.5亿',
                'growth': {
                    'revenue': 35.8,
                    'profit': 48.2
                },
                'shareholders': [
                    {'name': '埃隆·马斯克', 'ratio': 13.4},
                    {'name': 'The Vanguard Group', 'ratio': 8.2},
                    {'name': 'BlackRock', 'ratio': 6.5}
                ],
                'related_companies': [
                    {'name': '宁德时代', 'type': '供应商', 'relation': '电池供应商'},
                    {'name': '比亚迪', 'type': '竞争对手', 'relation': '新能源汽车竞争者'},
                    {'name': '松下', 'type': '供应商', 'relation': '电池合作伙伴'}
                ]
            },
            'LG新能源': {
                'id': '4',
                'name': 'LG新能源',
                'code': '373220',
                'industry': '新能源',
                'segment': '中游',
                'market_cap': 3200,
                'pe': 22.3,
                'pb': 5.8,
                'roe': 15.2,
                'eps': 6.8,
                'revenue': '1800.0亿',
                'profit': '156.8亿',
                'growth': {
                    'revenue': 28.5,
                    'profit': 32.1
                },
                'shareholders': [
                    {'name': 'LG集团', 'ratio': 34.5},
                    {'name': '韩国国民年金公团', 'ratio': 6.8},
                    {'name': '外国投资者', 'ratio': 25.3}
                ],
                'related_companies': [
                    {'name': '特斯拉', 'type': '客户', 'relation': '电池供应商'},
                    {'name': '宁德时代', 'type': '竞争对手', 'relation': '动力电池竞争者'},
                    {'name': '通用汽车', 'type': '客户', 'relation': '战略合作'}
                ]
            },
            '国轩高科': {
                'id': '5',
                'name': '国轩高科',
                'code': '002074',
                'industry': '新能源',
                'segment': '中游',
                'market_cap': 650,
                'pe': 18.7,
                'pb': 4.2,
                'roe': 12.7,
                'eps': 3.2,
                'revenue': '280.5亿',
                'profit': '28.5亿',
                'growth': {
                    'revenue': 22.3,
                    'profit': 25.8
                },
                'shareholders': [
                    {'name': '李缜', 'ratio': 18.5},
                    {'name': '大众汽车（中国）', 'ratio': 24.8},
                    {'name': '香港中央结算有限公司', 'ratio': 5.2}
                ],
                'related_companies': [
                    {'name': '大众汽车', 'type': '客户/股东', 'relation': '战略投资者'},
                    {'name': '宁德时代', 'type': '竞争对手', 'relation': '动力电池竞争者'},
                    {'name': '比亚迪', 'type': '竞争对手', 'relation': '动力电池竞争者'}
                ]
            }
        }
        return companies
    
    def get_company_list(self, industry=None, segment=None):
        """
        获取公司列表
        """
        all_companies = list(self.company_data.values()) + list(self.additional_companies.values())
        
        if industry:
            all_companies = [c for c in all_companies if c.get('industry') == industry]
        
        if segment:
            all_companies = [c for c in all_companies if c.get('segment') == segment]
        
        return all_companies
    
    def get_company_by_id(self, company_id):
        """
        根据ID获取公司详情
        """
        for company in list(self.company_data.values()) + list(self.additional_companies.values()):
            if company.get('id') == company_id:
                return company
        
        return None
    
    def get_company_by_name(self, name):
        """
        根据名称获取公司详情
        """
        if name in self.company_data:
            return self.company_data[name]
        if name in self.additional_companies:
            return self.additional_companies[name]
        
        for company in list(self.company_data.values()) + list(self.additional_companies.values()):
            if company.get('name') == name:
                return company
        
        return None
    
    def get_company_by_code(self, code):
        """
        根据股票代码获取公司详情
        """
        for company in list(self.company_data.values()) + list(self.additional_companies.values()):
            if company.get('code') == code:
                return company
        
        return None
    
    def search_companies(self, keyword):
        """
        搜索公司
        """
        results = []
        keyword_lower = keyword.lower()
        
        for company in list(self.company_data.values()) + list(self.additional_companies.values()):
            if (keyword_lower in company.get('name', '').lower() or
                keyword in company.get('code', '') or
                keyword_lower in company.get('industry', '').lower()):
                results.append(company)
        
        return results
    
    def get_shareholders(self, company_id):
        """
        获取公司股东信息
        """
        company = self.get_company_by_id(company_id)
        if company:
            return company.get('shareholders', [])
        return []
    
    def get_related_companies(self, company_id):
        """
        获取关联公司信息
        """
        company = self.get_company_by_id(company_id)
        if company:
            return company.get('related_companies', [])
        return []
    
    def get_financial_metrics(self, company_id):
        """
        获取公司财务指标
        """
        company = self.get_company_by_id(company_id)
        if not company:
            return None
        
        return {
            'pe': company.get('pe'),
            'pb': company.get('pb'),
            'roe': company.get('roe'),
            'eps': company.get('eps'),
            'market_cap': company.get('market_cap'),
            'revenue': company.get('revenue'),
            'profit': company.get('profit'),
            'growth': company.get('growth', {})
        }
    
    def compare_companies(self, company_ids):
        """
        比较多个公司的财务指标
        """
        comparison = {
            'companies': [],
            'metrics': {
                'pe': [],
                'pb': [],
                'roe': [],
                'market_cap': []
            }
        }
        
        for company_id in company_ids:
            company = self.get_company_by_id(company_id)
            if company:
                comparison['companies'].append(company.get('name'))
                comparison['metrics']['pe'].append(company.get('pe'))
                comparison['metrics']['pb'].append(company.get('pb'))
                comparison['metrics']['roe'].append(company.get('roe'))
                comparison['metrics']['market_cap'].append(company.get('market_cap'))
        
        return comparison
    
    def get_industry_averages(self, industry):
        """
        获取行业平均财务指标
        """
        companies = self.get_company_list(industry=industry)
        
        if not companies:
            return None
        
        total_pe = 0
        total_pb = 0
        total_roe = 0
        total_market_cap = 0
        
        valid_count = 0
        
        for company in companies:
            if company.get('pe') is not None:
                total_pe += company['pe']
            if company.get('pb') is not None:
                total_pb += company['pb']
            if company.get('roe') is not None:
                total_roe += company['roe']
            if company.get('market_cap') is not None:
                total_market_cap += company['market_cap']
            valid_count += 1
        
        if valid_count == 0:
            return None
        
        return {
            'industry': industry,
            'company_count': valid_count,
            'avg_pe': round(total_pe / valid_count, 2),
            'avg_pb': round(total_pb / valid_count, 2),
            'avg_roe': round(total_roe / valid_count, 2),
            'total_market_cap': total_market_cap
        }
    
    def get_segment_comparison(self, industry):
        """
        获取行业各环节的财务对比
        """
        segments = ['upstream', 'midstream', 'downstream']
        segment_names = {
            'upstream': '上游',
            'midstream': '中游',
            'downstream': '下游'
        }
        
        comparison = {}
        
        for segment in segments:
            companies = self.get_company_list(industry=industry, segment=segment)
            
            if companies:
                avg_pe = sum(c.get('pe', 0) for c in companies) / len(companies)
                avg_pb = sum(c.get('pb', 0) for c in companies) / len(companies)
                avg_roe = sum(c.get('roe', 0) for c in companies) / len(companies)
                total_market_cap = sum(c.get('market_cap', 0) for c in companies)
                
                comparison[segment_names[segment]] = {
                    'company_count': len(companies),
                    'avg_pe': round(avg_pe, 2),
                    'avg_pb': round(avg_pb, 2),
                    'avg_roe': round(avg_roe, 2),
                    'total_market_cap': total_market_cap
                }
        
        return comparison

company_manager = CompanyManager()
