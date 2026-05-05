import requests
from itertools import product
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class WeakPasswordDetector:
    def __init__(self, user_agent=None, timeout=10):
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.timeout = timeout
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
        self.common_passwords = Config.COMMON_PASSWORDS
        self.common_usernames = [
            'admin', 'root', 'test', 'user', 'guest',
            'administrator', 'superadmin', 'sysadmin',
            'admin1', 'admin2', 'test1', 'test2',
            'support', 'helpdesk', 'tech', 'manager',
            'developer', 'dev', 'webmaster', 'info',
            'contact', 'sales', 'marketing', 'hr',
        ]
    
    def detect(self, login_url, username_param, password_param, usernames=None, passwords=None):
        found_credentials = []
        
        test_usernames = usernames if usernames else self.common_usernames
        test_passwords = passwords if passwords else self.common_passwords
        
        session = requests.Session()
        
        for username in test_usernames:
            for password in test_passwords:
                if self._test_credentials(
                    session, login_url, 
                    username_param, password_param,
                    username, password
                ):
                    found_credentials.append({
                        'username': username,
                        'password': password,
                        'severity': 'high',
                        'type': 'weak_password',
                        'description': f'发现弱口令，用户名 {username} 使用了常见密码 {password}',
                        'recommendation': '实施强密码策略，限制登录尝试次数，启用多因素认证'
                    })
        
        return found_credentials
    
    def _test_credentials(self, session, login_url, username_param, password_param, username, password):
        try:
            form_data = {
                username_param: username,
                password_param: password,
            }
            
            response = session.post(
                login_url,
                data=form_data,
                headers=self.headers,
                timeout=self.timeout,
                allow_redirects=True
            )
            
            if self._check_login_success(response, form_data):
                return True
            
            failed_indicators = [
                'invalid', 'incorrect', 'wrong', 'error',
                'failed', 'denied', 'unauthorized', 'login',
                'password', 'username', 'credentials'
            ]
            
            response_lower = response.text.lower()
            for indicator in failed_indicators:
                if indicator in response_lower:
                    return False
            
            if 'welcome' in response_lower or 'dashboard' in response_lower:
                if 'logout' in response_lower:
                    return True
                    
        except Exception as e:
            print(f"Error testing credentials: {str(e)}")
        
        return False
    
    def _check_login_success(self, response, credentials):
        history = response.history
        
        if len(history) > 0:
            for resp in history:
                if resp.status_code in [301, 302, 303, 307]:
                    location = resp.headers.get('Location', '')
                    
                    redirect_indicators = [
                        'dashboard', 'home', 'profile', 'admin',
                        'welcome', 'panel', 'control', 'user'
                    ]
                    
                    for indicator in redirect_indicators:
                        if indicator in location.lower():
                            return True
        
        response_lower = response.text.lower()
        
        success_indicators = [
            'welcome', 'dashboard', 'logout', 'sign out',
            'profile', 'settings', 'account', 'my account',
            'logged in', 'signed in', 'authenticated',
            'admin panel', 'control panel', 'user panel'
        ]
        
        for indicator in success_indicators:
            if indicator in response_lower:
                return True
        
        failed_indicators = [
            'invalid username', 'invalid password',
            'wrong username', 'wrong password',
            'incorrect username', 'incorrect password',
            'login failed', 'authentication failed',
            'access denied', 'unauthorized',
            'try again', 'invalid credentials'
        ]
        
        for indicator in failed_indicators:
            if indicator in response_lower:
                return False
        
        return False
    
    def brute_force(self, login_url, username_param, password_param, 
                    username_list=None, password_list=None, max_attempts=100):
        found_credentials = []
        
        usernames = username_list if username_list else self.common_usernames[:10]
        passwords = password_list if password_list else self.common_passwords
        
        attempts = 0
        session = requests.Session()
        
        for username in usernames:
            for password in passwords:
                if attempts >= max_attempts:
                    break
                
                if self._test_credentials(
                    session, login_url,
                    username_param, password_param,
                    username, password
                ):
                    found_credentials.append({
                        'username': username,
                        'password': password,
                        'attempt': attempts + 1
                    })
                
                attempts += 1
            
            if attempts >= max_attempts:
                break
        
        return found_credentials
    
    def test_default_credentials(self, login_url, username_param='username', password_param='password'):
        default_credentials = [
            ('admin', 'admin'),
            ('admin', 'admin123'),
            ('admin', 'password'),
            ('admin', '123456'),
            ('root', 'root'),
            ('root', 'password'),
            ('test', 'test'),
            ('test', 'test123'),
            ('user', 'user'),
            ('user', 'password'),
            ('guest', 'guest'),
            ('administrator', 'administrator'),
            ('sysadmin', 'sysadmin'),
            ('superadmin', 'superadmin'),
        ]
        
        found_credentials = []
        session = requests.Session()
        
        for username, password in default_credentials:
            if self._test_credentials(
                session, login_url,
                username_param, password_param,
                username, password
            ):
                found_credentials.append({
                    'type': 'weak_password',
                    'severity': 'high',
                    'username': username,
                    'password': password,
                    'url': login_url,
                    'description': f'发现默认凭据，{username}:{password}',
                    'recommendation': '立即修改所有默认密码，实施强密码策略'
                })
        
        return found_credentials
