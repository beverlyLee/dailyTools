import requests
from urllib.parse import urlparse, urlencode
from bs4 import BeautifulSoup
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class XSSDetector:
    def __init__(self, user_agent=None, timeout=10):
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.timeout = timeout
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.xss_payloads = Config.XSS_PAYLOADS
        self.reflection_indicators = [
            '<script>',
            '<img',
            '<svg',
            'javascript:',
            'onerror',
            'onload',
            'alert(',
            'console.',
        ]
    
    def detect(self, url, params=None):
        vulnerabilities = []
        
        if params is None:
            params = self._extract_params_from_url(url)
        
        if not params:
            return vulnerabilities
        
        for param_name, original_value in params.items():
            for payload in self.xss_payloads:
                result = self._test_reflected_xss(url, param_name, original_value, payload)
                if result:
                    vulnerabilities.append({
                        'type': 'xss',
                        'severity': 'high',
                        'url': url,
                        'parameter': param_name,
                        'payload': payload,
                        'description': f'发现反射型 XSS 漏洞，参数 {param_name} 内容直接输出到页面',
                        'recommendation': '对所有用户输入进行 HTML 实体编码，实施内容安全策略 (CSP)'
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
    
    def _test_reflected_xss(self, url, param_name, original_value, payload):
        try:
            test_params = self._extract_params_from_url(url)
            test_params[param_name] = payload
            
            test_url = self._build_url(url, test_params)
            response = requests.get(test_url, headers=self.headers, timeout=self.timeout)
            
            response_text = response.text
            
            if payload in response_text:
                return True
            
            soup = BeautifulSoup(response_text, 'lxml')
            
            for script in soup.find_all('script'):
                if any(indicator in str(script) for indicator in self.reflection_indicators):
                    return True
            
            for img in soup.find_all('img'):
                if img.get('onerror') or 'xss' in str(img).lower():
                    return True
            
            for svg in soup.find_all('svg'):
                if svg.get('onload'):
                    return True
                    
        except Exception as e:
            print(f"Error testing XSS: {str(e)}")
        
        return False
    
    def test_stored_xss(self, url, form_data, submit_url=None):
        try:
            test_payload = '<script>alert("XSS_TEST")</script>'
            
            for key in form_data.keys():
                form_data[key] = test_payload
            
            submit_url = submit_url or url
            
            response = requests.post(
                submit_url,
                data=form_data,
                headers=self.headers,
                timeout=self.timeout
            )
            
            verify_response = requests.get(url, headers=self.headers, timeout=self.timeout)
            
            if test_payload in verify_response.text:
                return {
                    'type': 'xss',
                    'sub_type': 'stored',
                    'severity': 'high',
                    'url': url,
                    'payload': test_payload,
                    'description': '发现存储型 XSS 漏洞，恶意脚本被永久存储到服务器',
                    'recommendation': '实施严格的输入验证和输出编码，使用内容安全策略'
                }
                    
        except Exception as e:
            print(f"Error testing stored XSS: {str(e)}")
        
        return None
    
    def test_dom_xss(self, url, params=None):
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            soup = BeautifulSoup(response_text, 'lxml')
            
            scripts = soup.find_all('script')
            for script in scripts:
                script_content = str(script)
                
                dom_sinks = [
                    'document.write',
                    'document.writeln',
                    'innerHTML',
                    'outerHTML',
                    'eval',
                    'setTimeout',
                    'setInterval',
                    'location.href',
                    'location.hash',
                    'document.location',
                ]
                
                for sink in dom_sinks:
                    if sink in script_content:
                        dom_params = [
                            'location.search',
                            'location.hash',
                            'document.URL',
                            'document.referrer',
                            'window.name',
                        ]
                        
                        for param_source in dom_params:
                            if param_source in script_content:
                                return {
                                    'type': 'xss',
                                    'sub_type': 'dom',
                                    'severity': 'high',
                                    'url': url,
                                    'sink': sink,
                                    'source': param_source,
                                    'description': f'发现潜在 DOM-based XSS 漏洞，{param_source} 被传递到 {sink}',
                                    'recommendation': '使用安全的 DOM API，避免直接用户输入到危险的 DOM 方法'
                                }
                                
        except Exception as e:
            print(f"Error testing DOM XSS: {str(e)}")
        
        return None
    
    def _build_url(self, base_url, params):
        parsed_url = urlparse(base_url)
        query_string = urlencode(params)
        
        return f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?{query_string}"
