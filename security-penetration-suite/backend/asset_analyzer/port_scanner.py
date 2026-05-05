import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class PortScanner:
    def __init__(self, timeout=2, max_threads=20):
        self.timeout = timeout
        self.max_threads = max_threads
        self.common_ports = Config.COMMON_PORTS
        self.web_ports = Config.WEB_PORTS
        
        self.port_service_map = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            111: 'RPC',
            135: 'RPC',
            139: 'NetBIOS',
            143: 'IMAP',
            443: 'HTTPS',
            445: 'SMB',
            993: 'IMAPS',
            995: 'POP3S',
            1433: 'MSSQL',
            1434: 'MSSQL Monitor',
            3306: 'MySQL',
            3389: 'RDP',
            5432: 'PostgreSQL',
            5900: 'VNC',
            6379: 'Redis',
            8000: 'HTTP-Alt',
            8080: 'HTTP-Proxy',
            8443: 'HTTPS-Alt',
            8888: 'HTTP-Alt',
            9000: 'PHP-FPM',
            9090: 'HTTP-Alt',
        }
    
    def scan(self, target, ports=None):
        if ports is None:
            ports = self.common_ports
        
        open_ports = []
        closed_ports = []
        
        with ThreadPoolExecutor(max_workers=self.max_threads) as executor:
            futures = {
                executor.submit(self._scan_port, target, port): port 
                for port in ports
            }
            
            for future in as_completed(futures):
                port = futures[future]
                try:
                    result = future.result()
                    if result['state'] == 'open':
                        open_ports.append(result)
                    else:
                        closed_ports.append(result)
                except Exception as e:
                    closed_ports.append({
                        'port': port,
                        'protocol': 'tcp',
                        'service': self._get_service_name(port),
                        'state': 'error',
                        'version': None,
                        'error': str(e)
                    })
        
        open_ports.sort(key=lambda x: x['port'])
        closed_ports.sort(key=lambda x: x['port'])
        
        return {
            'open_ports': open_ports,
            'closed_ports': closed_ports,
            'target': target,
            'total_ports': len(ports),
            'open_count': len(open_ports),
            'closed_count': len(closed_ports),
        }
    
    def _scan_port(self, target, port):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            
            result = sock.connect_ex((target, port))
            
            if result == 0:
                service = self._get_service_name(port)
                version = self._get_service_version(target, port, service)
                
                sock.close()
                return {
                    'port': port,
                    'protocol': 'tcp',
                    'service': service,
                    'state': 'open',
                    'version': version,
                }
            else:
                sock.close()
                return {
                    'port': port,
                    'protocol': 'tcp',
                    'service': self._get_service_name(port),
                    'state': 'closed',
                    'version': None,
                }
                
        except socket.error as e:
            return {
                'port': port,
                'protocol': 'tcp',
                'service': self._get_service_name(port),
                'state': 'error',
                'version': None,
                'error': str(e)
            }
    
    def _get_service_name(self, port):
        return self.port_service_map.get(port, 'Unknown')
    
    def _get_service_version(self, target, port, service):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect((target, port))
            
            version = None
            
            if service == 'SSH':
                try:
                    banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
                    version = banner.replace('SSH-', '')
                except:
                    pass
                    
            elif service in ['FTP', 'SMTP', 'POP3', 'IMAP']:
                try:
                    banner = sock.recv(1024).decode('utf-8', errors='ignore').strip()
                    version = banner
                except:
                    pass
                    
            elif service in ['HTTP', 'HTTPS', 'HTTP-Alt', 'HTTP-Proxy']:
                try:
                    request = f"GET / HTTP/1.1\r\nHost: {target}\r\nUser-Agent: SecurityScanner/1.0\r\nConnection: close\r\n\r\n"
                    sock.send(request.encode())
                    response = sock.recv(4096).decode('utf-8', errors='ignore')
                    
                    for line in response.split('\r\n'):
                        if 'Server:' in line:
                            version = line.split(':', 1)[1].strip()
                            break
                except:
                    pass
            
            sock.close()
            return version
            
        except:
            return None
    
    def _get_ports(self, port_range, custom_ports=''):
        if port_range == 'common':
            return self.common_ports
        elif port_range == 'web':
            return self.web_ports
        elif port_range == 'full':
            return list(range(1, 65536))
        elif port_range == 'custom' and custom_ports:
            ports = []
            parts = custom_ports.split(',')
            for part in parts:
                part = part.strip()
                if '-' in part:
                    start, end = map(int, part.split('-'))
                    ports.extend(range(start, end + 1))
                else:
                    ports.append(int(part))
            return sorted(set(ports))
        else:
            return self.common_ports
    
    def quick_scan(self, target):
        return self.scan(target, self.web_ports)
    
    def full_scan(self, target):
        return self.scan(target, list(range(1, 65536)))
