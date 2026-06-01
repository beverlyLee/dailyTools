import requests
import streamlit as st
from typing import List, Dict, Optional


class APIClient:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.api_prefix = "/api/v1"
    
    def _get_url(self, endpoint: str) -> str:
        return f"{self.base_url}{self.api_prefix}{endpoint}"
    
    def get_status(self) -> Optional[Dict]:
        try:
            response = requests.get(self._get_url("/status"), timeout=5)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return None
    
    def get_jobs(self, industry: Optional[str] = None, source: Optional[str] = None) -> List[Dict]:
        try:
            params = {}
            if industry:
                params['industry'] = industry
            if source:
                params['source'] = source
            
            response = requests.get(self._get_url("/jobs"), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取职位数据失败: {str(e)}")
            return []
    
    def get_sample_jobs(self, count: int = 10) -> List[Dict]:
        try:
            response = requests.get(self._get_url("/jobs/sample"), params={'count': count}, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取示例职位失败: {str(e)}")
            return []
    
    def get_job_by_id(self, job_id: int) -> Optional[Dict]:
        try:
            response = requests.get(self._get_url(f"/jobs/{job_id}"), timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取职位详情失败: {str(e)}")
            return None
    
    def get_industries(self) -> List[str]:
        try:
            response = requests.get(self._get_url("/industries"), timeout=10)
            response.raise_for_status()
            return response.json().get('industries', [])
        except Exception as e:
            st.error(f"获取行业列表失败: {str(e)}")
            return []
    
    def get_sources(self) -> List[str]:
        try:
            response = requests.get(self._get_url("/sources"), timeout=10)
            response.raise_for_status()
            return response.json().get('sources', [])
        except Exception as e:
            st.error(f"获取数据源列表失败: {str(e)}")
            return []
    
    def extract_age_info(self, text: str) -> Optional[Dict]:
        try:
            response = requests.post(
                self._get_url("/nlp/extract-age"),
                json={"text": text},
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"NLP分析失败: {str(e)}")
            return None
    
    def get_overall_statistics(self, source: Optional[str] = None) -> Optional[Dict]:
        try:
            params = {}
            if source:
                params['source'] = source
            
            response = requests.get(self._get_url("/statistics/overall"), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取统计数据失败: {str(e)}")
            return None
    
    def get_industry_statistics(self, industry: Optional[str] = None, source: Optional[str] = None) -> Optional[Dict]:
        try:
            params = {}
            if industry:
                params['industry'] = industry
            if source:
                params['source'] = source
            
            response = requests.get(self._get_url("/statistics/industry"), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取行业统计失败: {str(e)}")
            return None
    
    def get_funnel_data(self, industry: Optional[str] = None, source: Optional[str] = None) -> Optional[Dict]:
        try:
            params = {}
            if industry:
                params['industry'] = industry
            if source:
                params['source'] = source
            
            response = requests.get(self._get_url("/funnel"), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取漏斗数据失败: {str(e)}")
            return None
    
    def get_funnel_comparison(self, source: Optional[str] = None) -> Optional[Dict]:
        try:
            params = {}
            if source:
                params['source'] = source
            
            response = requests.get(self._get_url("/funnel/compare"), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取行业对比漏斗数据失败: {str(e)}")
            return None
    
    def get_ai_suggestion(
        self,
        age: int,
        industry: str,
        position: str,
        years_of_experience: int,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.7
    ) -> Optional[Dict]:
        try:
            payload = {
                "age": age,
                "industry": industry,
                "position": position,
                "years_of_experience": years_of_experience,
                "temperature": temperature
            }
            if api_key:
                payload["api_key"] = api_key
            if model_name:
                payload["model_name"] = model_name
            
            response = requests.post(
                self._get_url("/ai/suggestion"),
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"获取AI建议失败: {str(e)}")
            return None
    
    def test_ai_connection(self, api_key: str, model_name: Optional[str] = None) -> Optional[Dict]:
        try:
            params = {"api_key": api_key}
            if model_name:
                params["model_name"] = model_name
            
            response = requests.post(
                self._get_url("/ai/test-connection"),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"AI连接测试失败: {str(e)}")
            return None
