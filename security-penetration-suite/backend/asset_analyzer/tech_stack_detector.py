import requests
from bs4 import BeautifulSoup
import re
import socket

class TechStackDetector:
    def __init__(self, timeout=5, user_agent=None):
        self.timeout = timeout
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        self.tech_signatures = {
            'web_server': [
                ('Server: nginx', 'Nginx', None),
                ('Server: Apache', 'Apache', None),
                ('Server: Microsoft-IIS', 'Microsoft IIS', None),
                ('Server: LiteSpeed', 'LiteSpeed', None),
                ('Server: Caddy', 'Caddy', None),
                ('Server: Tomcat', 'Apache Tomcat', None),
                ('Server: Jetty', 'Jetty', None),
                ('Server: Gunicorn', 'Gunicorn', None),
                ('Server: uWSGI', 'uWSGI', None),
                ('Server: cloudflare', 'Cloudflare', None),
                ('Server: OpenResty', 'OpenResty', None),
            ],
            'programming_language': [
                ('X-Powered-By: PHP/', 'PHP', 'php'),
                ('X-Powered-By: ASP.NET', 'ASP.NET', 'aspnet'),
                ('X-Powered-By: Express', 'Express.js', 'nodejs'),
                ('X-Powered-By: Next.js', 'Next.js', 'nodejs'),
                ('X-AspNet-Version:', 'ASP.NET', 'aspnet'),
                ('X-Django-Cache', 'Django', 'python'),
                ('Server: WSGI', 'Python (WSGI)', 'python'),
                ('Set-Cookie: PHPSESSID', 'PHP', 'php'),
                ('Set-Cookie: JSESSIONID', 'Java/JSP', 'java'),
                ('Set-Cookie: ci_session', 'CodeIgniter', 'php'),
                ('Set-Cookie: laravel_session', 'Laravel', 'php'),
                ('Set-Cookie: sessionid', 'Django', 'python'),
            ],
            'framework': [
                ('<meta name="generator" content="WordPress', 'WordPress', 'php'),
                ('<meta name="generator" content="Drupal', 'Drupal', 'php'),
                ('<meta name="generator" content="Joomla', 'Joomla', 'php'),
                ('wp-content/', 'WordPress', 'php'),
                ('wp-includes/', 'WordPress', 'php'),
                ('sites/default/', 'Drupal', 'php'),
                ('/templates/', 'Joomla', 'php'),
                ('/__webpack_require__', 'React/Vue (Webpack)', 'javascript'),
                ('_next/', 'Next.js', 'nodejs'),
                ('static/chunks/', 'Next.js', 'nodejs'),
                ('nuxt', 'Nuxt.js', 'nodejs'),
                ('vue', 'Vue.js', 'javascript'),
                ('react', 'React', 'javascript'),
                ('angular', 'Angular', 'javascript'),
                ('ember', 'Ember.js', 'javascript'),
                ('backbone', 'Backbone.js', 'javascript'),
                ('jquery', 'jQuery', 'javascript'),
                ('bootstrap', 'Bootstrap', 'css'),
                ('tailwind', 'Tailwind CSS', 'css'),
                ('semantic', 'Semantic UI', 'css'),
                ('materialize', 'Materialize CSS', 'css'),
            ],
            'database': [
                ('Server: MySQL', 'MySQL', None),
                ('Server: PostgreSQL', 'PostgreSQL', None),
                ('Server: MongoDB', 'MongoDB', None),
                ('Server: Redis', 'Redis', None),
            ],
            'cms': [
                ('/wp-json/', 'WordPress REST API', 'php'),
                ('/xmlrpc.php', 'WordPress XML-RPC', 'php'),
                ('/administrator/', 'Joomla Admin', 'php'),
                ('/user/login', 'Drupal', 'php'),
                ('/admin/login', 'Various CMS', None),
            ],
            'cloud_cdn': [
                ('Server: cloudflare', 'Cloudflare CDN', None),
                ('CF-Cache-Status:', 'Cloudflare', None),
                ('cf-ray:', 'Cloudflare', None),
                ('X-Cache: HIT', 'CDN Cache', None),
                ('X-Cache: MISS', 'CDN Cache', None),
                ('Server: Akamai', 'Akamai CDN', None),
                ('Server: Fastly', 'Fastly CDN', None),
                ('x-amz-cf-id:', 'AWS CloudFront', None),
                ('Server: Google', 'Google Cloud CDN', None),
            ],
        }
    
    def detect(self, target, port=80):
        try:
            if not target.startswith(('http://', 'https://')):
                protocol = 'https' if port in [443, 8443] else 'http'
                target = f"{protocol}://{target}"
            
            response = requests.get(
                target,
                headers=self.headers,
                timeout=self.timeout,
                verify=False,
                allow_redirects=True
            )
            
            tech_stack = {
                'web_server': [],
                'programming_language': [],
                'framework': [],
                'database': [],
                'cms': [],
                'cloud_cdn': [],
                'other': [],
            }
            
            self._detect_from_headers(response, tech_stack)
            
            try:
                soup = BeautifulSoup(response.content, 'lxml')
                self._detect_from_html(soup, tech_stack)
            except:
                pass
            
            self._detect_from_content(response.text, tech_stack)
            
            return self._normalize_results(tech_stack)
            
        except Exception as e:
            return None
    
    def _detect_from_headers(self, response, tech_stack):
        headers_str = str(response.headers).lower()
        
        for category, signatures in self.tech_signatures.items():
            for signature, name, lang in signatures:
                sig_lower = signature.lower()
                
                if ':' in sig_lower:
                    header_key = sig_lower.split(':')[0].strip()
                    header_value = response.headers.get(header_key, '').lower()
                    
                    if header_value and sig_lower.split(':')[1].strip() in header_value:
                        if header_key not in [str(x.get('name', '')) for x in tech_stack.get(category, [])]:
                            tech_stack[category].append({
                                'name': name,
                                'category': category,
                                'language': lang,
                                'source': 'header',
                                'header': header_key,
                            })
                
                elif sig_lower in headers_str:
                    tech_stack[category].append({
                        'name': name,
                        'category': category,
                        'language': lang,
                        'source': 'header',
                    })
    
    def _detect_from_html(self, soup, tech_stack):
        html = str(soup).lower()
        
        meta_generator = soup.find('meta', attrs={'name': 'generator'})
        if meta_generator:
            content = meta_generator.get('content', '').lower()
            
            if 'wordpress' in content:
                version = None
                version_match = re.search(r'wordpress\s+([\d.]+)', content, re.IGNORECASE)
                if version_match:
                    version = version_match.group(1)
                tech_stack['cms'].append({
                    'name': 'WordPress',
                    'version': version,
                    'category': 'cms',
                    'language': 'php',
                    'source': 'meta_generator',
                })
            elif 'drupal' in content:
                tech_stack['cms'].append({
                    'name': 'Drupal',
                    'category': 'cms',
                    'language': 'php',
                    'source': 'meta_generator',
                })
            elif 'joomla' in content:
                tech_stack['cms'].append({
                    'name': 'Joomla',
                    'category': 'cms',
                    'language': 'php',
                    'source': 'meta_generator',
                })
        
        scripts = soup.find_all('script', src=True)
        for script in scripts:
            src = script.get('src', '').lower()
            
            if 'jquery' in src:
                version = self._extract_js_version(src, 'jquery')
                tech_stack['framework'].append({
                    'name': 'jQuery',
                    'version': version,
                    'category': 'framework',
                    'language': 'javascript',
                    'source': 'script_src',
                })
            elif 'vue' in src:
                tech_stack['framework'].append({
                    'name': 'Vue.js',
                    'category': 'framework',
                    'language': 'javascript',
                    'source': 'script_src',
                })
            elif 'react' in src:
                tech_stack['framework'].append({
                    'name': 'React',
                    'category': 'framework',
                    'language': 'javascript',
                    'source': 'script_src',
                })
            elif 'angular' in src:
                tech_stack['framework'].append({
                    'name': 'Angular',
                    'category': 'framework',
                    'language': 'javascript',
                    'source': 'script_src',
                })
            elif 'bootstrap' in src:
                version = self._extract_js_version(src, 'bootstrap')
                tech_stack['framework'].append({
                    'name': 'Bootstrap',
                    'version': version,
                    'category': 'framework',
                    'language': 'css',
                    'source': 'script_src',
                })
        
        stylesheets = soup.find_all('link', rel='stylesheet')
        for style in stylesheets:
            href = style.get('href', '').lower()
            
            if 'bootstrap' in href:
                tech_stack['framework'].append({
                    'name': 'Bootstrap',
                    'category': 'framework',
                    'language': 'css',
                    'source': 'stylesheet',
                })
            elif 'tailwind' in href:
                tech_stack['framework'].append({
                    'name': 'Tailwind CSS',
                    'category': 'framework',
                    'language': 'css',
                    'source': 'stylesheet',
                })
    
    def _detect_from_content(self, content, tech_stack):
        content_lower = content.lower()
        
        if 'wp-content' in content_lower or 'wp-includes' in content_lower:
            if not any(x['name'] == 'WordPress' for x in tech_stack['cms']):
                tech_stack['cms'].append({
                    'name': 'WordPress',
                    'category': 'cms',
                    'language': 'php',
                    'source': 'content',
                })
        
        if 'laravel' in content_lower:
            if not any(x['name'] == 'Laravel' for x in tech_stack['framework']):
                tech_stack['framework'].append({
                    'name': 'Laravel',
                    'category': 'framework',
                    'language': 'php',
                    'source': 'content',
                })
        
        if 'django' in content_lower:
            if not any(x['name'] == 'Django' for x in tech_stack['framework']):
                tech_stack['framework'].append({
                    'name': 'Django',
                    'category': 'framework',
                    'language': 'python',
                    'source': 'content',
                })
        
        if 'express' in content_lower:
            if not any(x['name'] == 'Express.js' for x in tech_stack['framework']):
                tech_stack['framework'].append({
                    'name': 'Express.js',
                    'category': 'framework',
                    'language': 'nodejs',
                    'source': 'content',
                })
    
    def _extract_js_version(self, src, library):
        patterns = [
            rf'{library}-([\d.]+)\.min\.js',
            rf'{library}/([\d.]+)/',
            rf'{library}\.([\d.]+)\.js',
            rf'v([\d.]+)/{library}',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, src, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _normalize_results(self, tech_stack):
        normalized = {}
        
        for category, items in tech_stack.items():
            seen = set()
            unique_items = []
            
            for item in items:
                key = item['name'].lower()
                if key not in seen:
                    seen.add(key)
                    unique_items.append(item)
            
            normalized[category] = unique_items
        
        all_tech = []
        for category, items in normalized.items():
            for item in items:
                all_tech.append({
                    'name': item['name'],
                    'category': item['category'],
                    'language': item.get('language'),
                    'version': item.get('version'),
                    'source': item.get('source'),
                })
        
        return {
            'technologies': all_tech,
            'categories': normalized,
            'summary': {
                'total': len(all_tech),
                'by_category': {
                    'web_server': len(normalized.get('web_server', [])),
                    'programming_language': len(normalized.get('programming_language', [])),
                    'framework': len(normalized.get('framework', [])),
                    'database': len(normalized.get('database', [])),
                    'cms': len(normalized.get('cms', [])),
                    'cloud_cdn': len(normalized.get('cloud_cdn', [])),
                    'other': len(normalized.get('other', [])),
                }
            }
        }
