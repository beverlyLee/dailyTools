import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class CSRFDetector:
    def __init__(self, user_agent=None, timeout=10):
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.timeout = timeout
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.csrf_indicators = Config.CSRF_INDICATORS
        self.csrf_token_names = [
            'csrf_token',
            'csrfmiddlewaretoken',
            '_csrf',
            'authenticity_token',
            'xsrf_token',
            'token',
            '_token',
            'anti_csrf',
            'nonce',
        ]
    
    def detect(self, url):
        findings = {
            'vulnerable': False,
            'forms': [],
            'tokens_found': [],
            'missing_tokens': [],
        }
        
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            soup = BeautifulSoup(response.content, 'lxml')
            
            forms = soup.find_all('form')
            
            for form in forms:
                form_info = self._analyze_form(form, url)
                findings['forms'].append(form_info)
                
                if form_info['method'] == 'POST' and not form_info['has_csrf_token']:
                    findings['missing_tokens'].append(form_info)
                    findings['vulnerable'] = True
                    
        except Exception as e:
            print(f"Error detecting CSRF: {str(e)}")
        
        return findings
    
    def _analyze_form(self, form, base_url):
        form_info = {
            'action': form.get('action', ''),
            'method': form.get('method', 'GET').upper(),
            'inputs': [],
            'has_csrf_token': False,
            'csrf_token_name': None,
        }
        
        full_action = urljoin(base_url, form_info['action'])
        form_info['full_action'] = full_action
        
        for input_tag in form.find_all('input'):
            input_name = input_tag.get('name', '')
            input_type = input_tag.get('type', 'text')
            input_value = input_tag.get('value', '')
            
            input_info = {
                'name': input_name,
                'type': input_type,
                'value': input_value,
            }
            
            form_info['inputs'].append(input_info)
            
            if self._is_csrf_token(input_name, input_type):
                form_info['has_csrf_token'] = True
                form_info['csrf_token_name'] = input_name
        
        return form_info
    
    def _is_csrf_token(self, name, input_type):
        if not name:
            return False
        
        name_lower = name.lower()
        
        for indicator in self.csrf_indicators:
            if indicator in name_lower:
                return True
        
        for token_name in self.csrf_token_names:
            if name_lower == token_name:
                return True
        
        if input_type == 'hidden':
            if len(name) > 20 or 'token' in name_lower:
                return True
        
        return False
    
    def test_csrf_bypass(self, form_url, form_data, referer=None, origin=None):
        headers = self.headers.copy()
        
        if referer:
            headers['Referer'] = referer
        
        if origin:
            headers['Origin'] = origin
        
        try:
            response = requests.post(
                form_url,
                data=form_data,
                headers=headers,
                timeout=self.timeout,
                allow_redirects=False
            )
            
            status_analysis = {
                'status_code': response.status_code,
                'redirected': response.is_redirect,
                'redirect_url': response.headers.get('Location') if response.is_redirect else None,
            }
            
            if response.status_code in [200, 301, 302, 303, 304, 307, 308]:
                return {
                    'vulnerable': True,
                    'analysis': status_analysis,
                    'description': '请求成功执行，可能存在 CSRF 漏洞',
                    'recommendation': '实施 CSRF 令牌验证，验证 Referer/Origin 头'
                }
                    
        except Exception as e:
            print(f"Error testing CSRF bypass: {str(e)}")
        
        return {
            'vulnerable': False,
            'description': '无法确定 CSRF 漏洞状态'
        }
    
    def check_same_site_cookies(self, url):
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            
            cookie_analysis = {
                'cookies': [],
                'missing_same_site': [],
                'secure_only': [],
            }
            
            for cookie in response.cookies:
                cookie_info = {
                    'name': cookie.name,
                    'value': cookie.value[:20] + '...' if len(cookie.value) > 20 else cookie.value,
                    'secure': cookie.secure,
                    'httponly': cookie.has_nonstandard_attr('HttpOnly'),
                    'samesite': cookie.get_nonstandard_attr('SameSite', None),
                }
                
                cookie_analysis['cookies'].append(cookie_info)
                
                if not cookie_info['samesite']:
                    cookie_analysis['missing_same_site'].append(cookie_info)
                
                if cookie_info['secure']:
                    cookie_analysis['secure_only'].append(cookie_info)
            
            if len(cookie_analysis['missing_same_site']) > 0:
                cookie_analysis['vulnerable'] = True
                cookie_analysis['description'] = '发现未设置 SameSite 属性的 Cookie，存在 CSRF 风险'
            else:
                cookie_analysis['vulnerable'] = False
            
            return cookie_analysis
                    
        except Exception as e:
            print(f"Error checking SameSite cookies: {str(e)}")
            return {
                'vulnerable': None,
                'error': str(e)
            }
