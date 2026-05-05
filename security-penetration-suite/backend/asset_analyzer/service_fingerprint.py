import socket
import requests
from bs4 import BeautifulSoup
import re

class ServiceFingerprint:
    def __init__(self, timeout=5, user_agent=None):
        self.timeout = timeout
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        self.service_banners = {
            'FTP': [
                ('220 ProFTPD', 'ProFTPD'),
                ('220 vsFTPd', 'vsFTPd'),
                ('220 Pure-FTPd', 'Pure-FTPd'),
                ('220 Microsoft FTP', 'Microsoft FTP'),
                ('220 FileZilla', 'FileZilla Server'),
            ],
            'SSH': [
                ('SSH-2.0-OpenSSH_', 'OpenSSH'),
                ('SSH-1.99-OpenSSH_', 'OpenSSH'),
                ('SSH-2.0-Dropbear_', 'Dropbear'),
                ('SSH-2.0-Cisco', 'Cisco SSH'),
            ],
            'SMTP': [
                ('220 ESMTP Exim', 'Exim'),
                ('220 ESMTP Postfix', 'Postfix'),
                ('220 ESMTP Sendmail', 'Sendmail'),
                ('220 Microsoft ESMTP', 'Microsoft Exchange'),
                ('220 qmail', 'qmail'),
            ],
            'MySQL': [
                ('mysql_native_password', 'MySQL'),
                ('caching_sha2_password', 'MySQL 8.0+'),
            ],
        }
    
    def identify(self, target, port, service_name=None):
        try:
            if service_name and service_name in ['HTTP', 'HTTPS', 'HTTP-Alt', 'HTTP-Proxy', 'HTTPS-Alt']:
                return self._identify_http_service(target, port)
            
            if service_name == 'SSH':
                return self._identify_ssh_service(target, port)
            
            if service_name in ['FTP', 'SMTP', 'POP3', 'IMAP']:
                return self._identify_banner_service(target, port, service_name)
            
            if service_name in ['MySQL', 'MSSQL', 'PostgreSQL', 'Redis']:
                return self._identify_database_service(target, port, service_name)
            
            return self._try_all_methods(target, port)
            
        except Exception as e:
            return None
    
    def _identify_http_service(self, target, port):
        try:
            protocol = 'https' if port in [443, 8443] else 'http'
            url = f"{protocol}://{target}:{port}/"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=self.timeout,
                verify=False,
                allow_redirects=False
            )
            
            service_info = {
                'name': 'HTTP',
                'version': None,
                'port': port,
                'details': {},
            }
            
            server = response.headers.get('Server', '')
            if server:
                service_info['name'] = self._extract_server_name(server)
                service_info['version'] = self._extract_version(server)
                service_info['details']['server_header'] = server
            
            powered_by = response.headers.get('X-Powered-By', '')
            if powered_by:
                service_info['details']['x_powered_by'] = powered_by
            
            aspnet_version = response.headers.get('X-AspNet-Version', '')
            if aspnet_version:
                service_info['details']['aspnet_version'] = aspnet_version
            
            try:
                soup = BeautifulSoup(response.content, 'lxml')
                
                meta_generator = soup.find('meta', attrs={'name': 'generator'})
                if meta_generator:
                    service_info['details']['meta_generator'] = meta_generator.get('content', '')
                
                for script in soup.find_all('script', src=True):
                    src = script.get('src', '')
                    if 'jquery' in src.lower():
                        service_info['details']['jquery'] = True
                    if 'react' in src.lower():
                        service_info['details']['react'] = True
                    if 'vue' in src.lower():
                        service_info['details']['vue'] = True
                    if 'angular' in src.lower():
                        service_info['details']['angular'] = True
                        
            except:
                pass
            
            service_info['details']['status_code'] = response.status_code
            
            return service_info
            
        except Exception as e:
            return None
    
    def _identify_ssh_service(self, target, port):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((target, port))
            
            banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
            sock.close()
            
            service_info = {
                'name': 'SSH',
                'version': None,
                'port': port,
                'details': {'banner': banner},
            }
            
            for pattern, name in self.service_banners.get('SSH', []):
                if pattern in banner:
                    service_info['name'] = name
                    version_match = re.search(r'_([\d.]+)', banner)
                    if version_match:
                        service_info['version'] = version_match.group(1)
                    break
            
            return service_info
            
        except Exception as e:
            return None
    
    def _identify_banner_service(self, target, port, service_name):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((target, port))
            
            banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
            sock.close()
            
            service_info = {
                'name': service_name,
                'version': None,
                'port': port,
                'details': {'banner': banner},
            }
            
            for pattern, name in self.service_banners.get(service_name, []):
                if pattern in banner:
                    service_info['name'] = name
                    version_match = re.search(r'([\d.]+)', banner)
                    if version_match:
                        service_info['version'] = version_match.group(1)
                    break
            
            return service_info
            
        except Exception as e:
            return None
    
    def _identify_database_service(self, target, port, service_name):
        try:
            service_info = {
                'name': service_name,
                'version': None,
                'port': port,
                'details': {},
            }
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            
            result = sock.connect_ex((target, port))
            
            if result == 0:
                if service_name == 'MySQL':
                    try:
                        data = sock.recv(1024)
                        if len(data) > 4:
                            packet_length = int.from_bytes(data[:3], byteorder='little')
                            if packet_length > 0 and len(data) > 5:
                                protocol_version = data[4]
                                service_info['details']['protocol_version'] = protocol_version
                                
                                null_index = data.find(b'\x00', 5)
                                if null_index > 5:
                                    version = data[5:null_index].decode('utf-8', errors='ignore')
                                    service_info['version'] = version
                    except:
                        pass
                
                sock.close()
            
            return service_info if result == 0 else None
            
        except Exception as e:
            return None
    
    def _try_all_methods(self, target, port):
        methods = [
            self._identify_http_service,
            self._identify_ssh_service,
            self._identify_banner_service,
        ]
        
        for method in methods:
            try:
                result = method(target, port)
                if result:
                    return result
            except:
                pass
        
        return None
    
    def _extract_server_name(self, server_header):
        server_lower = server_header.lower()
        
        if 'nginx' in server_lower:
            return 'Nginx'
        elif 'apache' in server_lower:
            return 'Apache'
        elif 'iis' in server_lower:
            return 'Microsoft IIS'
        elif 'tomcat' in server_lower:
            return 'Apache Tomcat'
        elif 'jetty' in server_lower:
            return 'Jetty'
        elif 'cloudflare' in server_lower:
            return 'Cloudflare'
        elif 'gunicorn' in server_lower:
            return 'Gunicorn'
        elif 'uwsgi' in server_lower:
            return 'uWSGI'
        else:
            return server_header.split('/')[0] if '/' in server_header else server_header
    
    def _extract_version(self, server_header):
        match = re.search(r'/([\d.]+)', server_header)
        if match:
            return match.group(1)
        return None
