import requests
from urllib.parse import urlparse, urlencode, parse_qs
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class SQLiDetector:
    def __init__(self, user_agent=None, timeout=10):
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.timeout = timeout
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.sqli_payloads = Config.SQLI_PAYLOADS
        self.error_patterns = [
            'you have an error in your sql syntax',
            'mysql_fetch',
            'mssql_query',
            'ora-',
            'postgresql',
            'sqlite3_',
            'unclosed quotation mark',
            'quoted string not properly terminated',
            'syntax error',
            'mysql error',
            'sql server error',
            'oracle error',
            'pg_query',
        ]
        self.time_based_payloads = [
            "' AND SLEEP(5)--",
            "'; WAITFOR DELAY '0:0:5'--",
            "' OR pg_sleep(5)--",
            "1' AND SLEEP(5) AND '1'='1",
        ]
    
    def detect(self, url, params=None):
        vulnerabilities = []
        
        if params is None:
            params = self._extract_params_from_url(url)
        
        if not params:
            return vulnerabilities
        
        for param_name, original_value in params.items():
            for payload in self.sqli_payloads:
                if self._test_error_based(url, param_name, original_value, payload):
                    vulnerabilities.append({
                        'type': 'sql_injection',
                        'severity': 'critical',
                        'url': url,
                        'parameter': param_name,
                        'payload': payload,
                        'description': f'发现 SQL 注入漏洞，参数 {param_name} 存在错误注入点',
                        'recommendation': '使用参数化查询或预编译语句，对用户输入进行严格过滤和验证'
                    })
                    break
                
                if self._test_boolean_based(url, param_name, original_value):
                    vulnerabilities.append({
                        'type': 'sql_injection',
                        'severity': 'critical',
                        'url': url,
                        'parameter': param_name,
                        'payload': 'Boolean-based blind injection',
                        'description': f'发现布尔盲注漏洞，参数 {param_name} 可被利用进行条件判断',
                        'recommendation': '使用参数化查询，实施输入验证，使用最小权限数据库账户'
                    })
                    break
        
        return vulnerabilities
    
    def _extract_params_from_url(self, url):
        params = {}
        parsed_url = urlparse(url)
        if parsed_url.query:
            from urllib.parse import parse_qs
            query_params = parse_qs(parsed_url.query)
            for key, values in query_params.items():
                params[key] = values[0] if len(values) == 1 else values
        return params
    
    def _test_error_based(self, url, param_name, original_value, payload):
        try:
            test_params = self._extract_params_from_url(url)
            test_params[param_name] = original_value + payload
            
            test_url = self._build_url(url, test_params)
            response = requests.get(test_url, headers=self.headers, timeout=self.timeout)
            
            content = response.text.lower()
            for pattern in self.error_patterns:
                if pattern in content:
                    return True
            
            original_url = self._build_url(url, self._extract_params_from_url(url))
            original_response = requests.get(original_url, headers=self.headers, timeout=self.timeout)
            
            if response.status_code != original_response.status_code:
                if response.status_code == 500:
                    return True
            
            if len(response.text) != len(original_response.text):
                if abs(len(response.text) - len(original_response.text)) > 100:
                    return True
                    
        except Exception as e:
            print(f"Error testing SQLi: {str(e)}")
        
        return False
    
    def _test_boolean_based(self, url, param_name, original_value):
        try:
            true_payload = f"{original_value}' AND '1'='1"
            false_payload = f"{original_value}' AND '1'='2"
            
            true_params = self._extract_params_from_url(url)
            true_params[param_name] = true_payload
            true_url = self._build_url(url, true_params)
            true_response = requests.get(true_url, headers=self.headers, timeout=self.timeout)
            
            false_params = self._extract_params_from_url(url)
            false_params[param_name] = false_payload
            false_url = self._build_url(url, false_params)
            false_response = requests.get(false_url, headers=self.headers, timeout=self.timeout)
            
            if len(true_response.text) != len(false_response.text):
                if abs(len(true_response.text) - len(false_response.text)) > 50:
                    return True
                    
        except Exception as e:
            print(f"Error testing boolean-based SQLi: {str(e)}")
        
        return False
    
    def _build_url(self, base_url, params):
        parsed_url = urlparse(base_url)
        query_string = urlencode(params)
        
        return f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?{query_string}"
