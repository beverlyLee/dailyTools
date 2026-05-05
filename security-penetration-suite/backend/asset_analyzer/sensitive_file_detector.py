import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class SensitiveFileDetector:
    def __init__(self, timeout=5, max_threads=10, user_agent=None):
        self.timeout = timeout
        self.max_threads = max_threads
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        self.sensitive_paths = Config.SENSITIVE_FILES
        
        self.path_descriptions = {
            '/.git/config': 'Git 配置文件，包含仓库信息和远程地址',
            '/.git/HEAD': 'Git HEAD 文件，暴露当前分支信息',
            '/.env': '环境变量配置文件，可能包含数据库密码、API 密钥等敏感信息',
            '/.env.local': '本地环境变量配置文件',
            '/.env.development': '开发环境变量配置文件',
            '/.env.production': '生产环境变量配置文件',
            '/config.php': 'PHP 配置文件，可能包含数据库连接信息',
            '/config.inc.php': 'PHP 包含配置文件',
            '/database.php': '数据库配置文件',
            '/db.php': '数据库连接文件',
            '/.htaccess': 'Apache 服务器配置文件',
            '/.htpasswd': 'Apache 密码文件，包含加密的用户密码',
            '/web.config': 'IIS 配置文件',
            '/robots.txt': '搜索引擎爬虫规则文件，可能泄露敏感目录结构',
            '/sitemap.xml': '站点地图文件，包含所有页面链接',
            '/admin/': '管理后台目录',
            '/backup/': '备份文件目录',
            '/bak/': '备份文件目录缩写',
            '/sql/': 'SQL 文件目录',
            '/.DS_Store': 'MacOS 目录元数据文件',
            '/README.md': '项目说明文档，可能包含敏感信息',
            '/CHANGELOG.md': '变更日志，可能包含版本信息',
            '/LICENSE': '许可证文件',
        }
        
        self.path_severity = {
            '/.git/config': 'critical',
            '/.git/HEAD': 'high',
            '/.env': 'critical',
            '/.env.local': 'critical',
            '/.env.development': 'high',
            '/.env.production': 'critical',
            '/config.php': 'high',
            '/config.inc.php': 'high',
            '/database.php': 'critical',
            '/db.php': 'critical',
            '/.htaccess': 'medium',
            '/.htpasswd': 'critical',
            '/web.config': 'medium',
            '/robots.txt': 'low',
            '/sitemap.xml': 'low',
            '/admin/': 'high',
            '/backup/': 'high',
            '/bak/': 'high',
            '/sql/': 'high',
            '/.DS_Store': 'low',
            '/README.md': 'low',
            '/CHANGELOG.md': 'low',
            '/LICENSE': 'info',
        }
        
        self.path_types = {
            '/.git/config': 'Git 配置',
            '/.git/HEAD': 'Git 文件',
            '/.env': '环境配置',
            '/.env.local': '环境配置',
            '/.env.development': '环境配置',
            '/.env.production': '环境配置',
            '/config.php': 'PHP 配置',
            '/config.inc.php': 'PHP 配置',
            '/database.php': '数据库配置',
            '/db.php': '数据库配置',
            '/.htaccess': '服务器配置',
            '/.htpasswd': '密码文件',
            '/web.config': '服务器配置',
            '/robots.txt': '搜索引擎规则',
            '/sitemap.xml': '站点地图',
            '/admin/': '管理后台',
            '/backup/': '备份目录',
            '/bak/': '备份目录',
            '/sql/': 'SQL 目录',
            '/.DS_Store': '系统文件',
            '/README.md': '文档文件',
            '/CHANGELOG.md': '文档文件',
            '/LICENSE': '许可证文件',
        }
    
    def detect(self, target, custom_paths=None):
        found_files = []
        paths_to_check = list(self.sensitive_paths)
        
        if custom_paths:
            paths_to_check.extend(custom_paths)
        
        if not target.startswith(('http://', 'https://')):
            target = 'http://' + target
        
        target = target.rstrip('/')
        
        with ThreadPoolExecutor(max_workers=self.max_threads) as executor:
            futures = {
                executor.submit(self._check_path, target, path): path
                for path in paths_to_check
            }
            
            for future in as_completed(futures):
                path = futures[future]
                try:
                    result = future.result()
                    if result:
                        found_files.append(result)
                except Exception as e:
                    print(f"Error checking {path}: {str(e)}")
        
        return found_files
    
    def _check_path(self, target, path):
        try:
            full_url = target + path
            
            response = requests.get(
                full_url,
                headers=self.headers,
                timeout=self.timeout,
                verify=False,
                allow_redirects=False
            )
            
            if self._is_exposed(response, path):
                return {
                    'path': path,
                    'url': full_url,
                    'type': self.path_types.get(path, '未知'),
                    'severity': self.path_severity.get(path, 'info'),
                    'description': self.path_descriptions.get(path, '发现潜在敏感文件'),
                    'status_code': response.status_code,
                    'content_length': len(response.content),
                    'content_preview': response.text[:500] if len(response.text) > 0 else ''
                }
                
        except requests.exceptions.RequestException:
            pass
        
        return None
    
    def _is_exposed(self, response, path):
        status_code = response.status_code
        
        if status_code == 404 or status_code == 403:
            return False
        
        if path.endswith('/'):
            if status_code == 403:
                return True
        
        if status_code == 200:
            content_type = response.headers.get('Content-Type', '').lower()
            
            if 'text/html' in content_type and len(response.content) > 0:
                if '404' in response.text.lower() or 'not found' in response.text.lower():
                    if len(response.content) < 1000:
                        return False
            
            if path.endswith(('.env', '.php', '.config', '.inc', '.git')):
                if len(response.content) > 0:
                    return True
            
            if path.endswith(('.txt', '.xml', '.md', '.json')):
                if len(response.content) > 0:
                    return True
            
            if path.startswith('/.git/'):
                if len(response.content) > 0:
                    if 'ref:' in response.text or '[core]' in response.text:
                        return True
            
            if len(response.content) > 0:
                return True
        
        if status_code in [301, 302, 303, 307, 308]:
            location = response.headers.get('Location', '')
            if not location or len(location) < 2:
                return True
        
        if status_code == 401:
            return True
        
        return False
    
    def quick_check(self, target):
        high_risk_paths = [
            '/.env',
            '/.git/config',
            '/.env.production',
            '/.htpasswd',
            '/database.php',
            '/db.php',
        ]
        
        return self.detect(target, custom_paths=high_risk_paths)
    
    def check_git_exposure(self, target):
        git_paths = [
            '/.git/config',
            '/.git/HEAD',
            '/.git/index',
            '/.git/objects/',
            '/.git/logs/HEAD',
        ]
        
        return self.detect(target, custom_paths=git_paths)
    
    def check_env_exposure(self, target):
        env_paths = [
            '/.env',
            '/.env.local',
            '/.env.development',
            '/.env.production',
            '/.env.example',
            '/.env.dist',
            '/.env.test',
        ]
        
        return self.detect(target, custom_paths=env_paths)
    
    def check_backup_files(self, target):
        backup_paths = [
            '/backup/',
            '/bak/',
            '/backups/',
            '/backup.sql',
            '/database.sql',
            '/dump.sql',
            '/backup.tar.gz',
            '/backup.zip',
        ]
        
        return self.detect(target, custom_paths=backup_paths)
