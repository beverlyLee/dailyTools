from datetime import datetime
import socket

class AssetPortrait:
    def __init__(self):
        self.risk_factors = {
            'critical': 100,
            'high': 75,
            'medium': 50,
            'low': 25,
            'info': 5,
        }
        
        self.risk_descriptions = {
            'critical': '存在严重安全漏洞，建议立即修复',
            'high': '存在高危安全问题，建议尽快处理',
            'medium': '存在中等安全风险，建议定期检查',
            'low': '存在低风险问题，建议优化配置',
            'info': '信息性发现，无直接安全风险',
        }
        
        self.risk_thresholds = {
            'critical': 80,
            'high': 60,
            'medium': 40,
            'low': 20,
        }
    
    def build_portrait(self, target, scan_results):
        portrait = {
            'target': target,
            'ip_address': self._resolve_ip(target),
            'scan_time': datetime.now().isoformat(),
            'scan_summary': {
                'open_ports': 0,
                'services': 0,
                'sensitive_files': 0,
                'technologies': 0,
            },
            'ports': [],
            'services': [],
            'sensitive_files': [],
            'technologies': [],
            'risk_assessment': {
                'overall_score': 0,
                'overall_level': 'info',
                'overall_description': '',
                'risk_breakdown': {
                    'network_risk': 0,
                    'service_risk': 0,
                    'data_risk': 0,
                    'tech_risk': 0,
                },
                'vulnerabilities': [],
                'recommendations': [],
            },
            'asset_profile': {
                'type': 'unknown',
                'categories': [],
                'description': '',
            },
        }
        
        if 'port_scan' in scan_results:
            self._add_port_info(portrait, scan_results['port_scan'])
        
        if 'service_fingerprint' in scan_results:
            self._add_service_info(portrait, scan_results['service_fingerprint'])
        
        if 'sensitive_files' in scan_results:
            self._add_sensitive_file_info(portrait, scan_results['sensitive_files'])
        
        if 'tech_stack' in scan_results:
            self._add_tech_info(portrait, scan_results['tech_stack'])
        
        self._calculate_risk(portrait)
        self._build_asset_profile(portrait)
        
        return portrait
    
    def _resolve_ip(self, target):
        try:
            if target.startswith(('http://', 'https://')):
                import urllib.parse
                parsed = urllib.parse.urlparse(target)
                host = parsed.netloc.split(':')[0]
            else:
                host = target.split(':')[0] if ':' in target else target
            
            ip = socket.gethostbyname(host)
            return ip
        except:
            return None
    
    def _add_port_info(self, portrait, port_scan_results):
        if not port_scan_results:
            return
        
        open_ports = port_scan_results.get('open_ports', [])
        
        portrait['scan_summary']['open_ports'] = len(open_ports)
        
        for port in open_ports:
            portrait['ports'].append({
                'port': port.get('port'),
                'protocol': port.get('protocol', 'tcp'),
                'state': port.get('state', 'open'),
                'service': port.get('service', 'Unknown'),
                'version': port.get('version'),
            })
    
    def _add_service_info(self, portrait, service_results):
        if not service_results:
            return
        
        portrait['scan_summary']['services'] = len(service_results)
        
        for service in service_results:
            portrait['services'].append({
                'name': service.get('name'),
                'version': service.get('version'),
                'port': service.get('port'),
                'details': service.get('details', {}),
            })
    
    def _add_sensitive_file_info(self, portrait, sensitive_files):
        if not sensitive_files:
            return
        
        portrait['scan_summary']['sensitive_files'] = len(sensitive_files)
        
        for file_info in sensitive_files:
            portrait['sensitive_files'].append({
                'path': file_info.get('path'),
                'url': file_info.get('url'),
                'type': file_info.get('type', 'Unknown'),
                'severity': file_info.get('severity', 'info'),
                'description': file_info.get('description'),
                'status_code': file_info.get('status_code'),
                'content_length': file_info.get('content_length'),
            })
    
    def _add_tech_info(self, portrait, tech_results):
        if not tech_results:
            return
        
        technologies = tech_results.get('technologies', [])
        
        portrait['scan_summary']['technologies'] = len(technologies)
        
        for tech in technologies:
            portrait['technologies'].append({
                'name': tech.get('name'),
                'version': tech.get('version'),
                'category': tech.get('category'),
                'language': tech.get('language'),
                'source': tech.get('source'),
            })
    
    def _calculate_risk(self, portrait):
        network_risk = 0
        service_risk = 0
        data_risk = 0
        tech_risk = 0
        
        open_ports = portrait['scan_summary']['open_ports']
        if open_ports > 10:
            network_risk += 50
        elif open_ports > 5:
            network_risk += 30
        elif open_ports > 0:
            network_risk += 10
        
        dangerous_ports = [21, 23, 3306, 5432, 6379, 3389, 1433]
        for port in portrait['ports']:
            if port['port'] in dangerous_ports:
                network_risk += self.risk_factors.get('high', 75)
            if 'telnet' in port['service'].lower():
                network_risk += self.risk_factors.get('critical', 100)
        
        for file_info in portrait['sensitive_files']:
            severity = file_info.get('severity', 'info')
            risk_points = self.risk_factors.get(severity, 5)
            data_risk += risk_points
            
            portrait['risk_assessment']['vulnerabilities'].append({
                'type': 'sensitive_file',
                'severity': severity,
                'description': file_info.get('description'),
                'details': file_info.get('path'),
            })
        
        known_vulnerable_versions = {
            'Apache': {
                'threshold': '2.4.49',
                'severity': 'high',
                'cve': 'CVE-2021-41773',
            },
            'Nginx': {
                'threshold': '1.17.0',
                'severity': 'medium',
            },
            'PHP': {
                'threshold': '7.0.0',
                'severity': 'high',
            },
        }
        
        for tech in portrait['technologies']:
            tech_name = tech.get('name', '')
            tech_version = tech.get('version')
            
            for known_name, vuln_info in known_vulnerable_versions.items():
                if known_name.lower() in tech_name.lower():
                    if tech_version:
                        try:
                            if self._version_compare(tech_version, vuln_info['threshold']) < 0:
                                severity = vuln_info.get('severity', 'medium')
                                risk_points = self.risk_factors.get(severity, 50)
                                tech_risk += risk_points
                                
                                portrait['risk_assessment']['vulnerabilities'].append({
                                    'type': 'outdated_technology',
                                    'severity': severity,
                                    'description': f'检测到可能存在漏洞的 {tech_name} 版本 {tech_version}',
                                    'details': vuln_info.get('cve', '建议升级到最新版本'),
                                })
                        except:
                            pass
        
        for service in portrait['services']:
            service_name = service.get('name', '').lower()
            
            if 'telnet' in service_name:
                service_risk += self.risk_factors.get('critical', 100)
                portrait['risk_assessment']['vulnerabilities'].append({
                    'type': 'insecure_service',
                    'severity': 'critical',
                    'description': '检测到 Telnet 服务，建议立即关闭或替换为 SSH',
                    'details': 'Telnet 传输数据未加密',
                })
            
            if 'ftp' in service_name and 'sftp' not in service_name:
                service_risk += self.risk_factors.get('high', 75)
                portrait['risk_assessment']['vulnerabilities'].append({
                    'type': 'insecure_service',
                    'severity': 'high',
                    'description': '检测到 FTP 服务，建议使用 SFTP 或 FTPS',
                    'details': '标准 FTP 传输数据未加密',
                })
        
        total_risk = network_risk + service_risk + data_risk + tech_risk
        max_risk = 400
        
        scaled_score = min(100, int((total_risk / max_risk) * 100))
        
        if scaled_score >= self.risk_thresholds['critical']:
            overall_level = 'critical'
        elif scaled_score >= self.risk_thresholds['high']:
            overall_level = 'high'
        elif scaled_score >= self.risk_thresholds['medium']:
            overall_level = 'medium'
        elif scaled_score >= self.risk_thresholds['low']:
            overall_level = 'low'
        else:
            overall_level = 'info'
        
        portrait['risk_assessment']['overall_score'] = scaled_score
        portrait['risk_assessment']['overall_level'] = overall_level
        portrait['risk_assessment']['overall_description'] = self.risk_descriptions.get(overall_level, '')
        
        portrait['risk_assessment']['risk_breakdown'] = {
            'network_risk': network_risk,
            'service_risk': service_risk,
            'data_risk': data_risk,
            'tech_risk': tech_risk,
        }
        
        self._generate_recommendations(portrait)
    
    def _build_asset_profile(self, portrait):
        categories = []
        asset_type = 'unknown'
        
        if any('HTTP' in s.get('service', '') or 'HTTPS' in s.get('service', '') for s in portrait['ports']):
            categories.append('web_server')
            asset_type = 'web_server'
        
        if any('database' in t.get('category', '').lower() or t.get('name') in ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'] for t in portrait['technologies']):
            categories.append('database_server')
            if asset_type == 'unknown':
                asset_type = 'database_server'
        
        if any('CMS' in t.get('category', '') or t.get('name') in ['WordPress', 'Drupal', 'Joomla'] for t in portrait['technologies']):
            categories.append('cms')
            asset_type = 'cms'
        
        if any('SSH' in s.get('service', '') for s in portrait['ports']):
            categories.append('remote_access')
        
        if any('FTP' in s.get('service', '') for s in portrait['ports']):
            categories.append('file_server')
        
        portrait['asset_profile']['type'] = asset_type
        portrait['asset_profile']['categories'] = categories
        
        descriptions = {
            'web_server': '该目标是一台 Web 服务器，运行着网站或 Web 应用',
            'database_server': '该目标可能是数据库服务器，需要额外注意数据安全',
            'cms': '该目标运行着内容管理系统 (CMS)',
            'unknown': '该目标的资产类型无法明确识别',
        }
        
        portrait['asset_profile']['description'] = descriptions.get(asset_type, '未知类型的资产')
    
    def _generate_recommendations(self, portrait):
        recommendations = []
        
        if portrait['scan_summary']['open_ports'] > 5:
            recommendations.append({
                'priority': 'medium',
                'title': '减少开放端口数量',
                'description': f'当前开放 {portrait["scan_summary"]["open_ports"]} 个端口，建议只开放必要的服务端口',
            })
        
        for port in portrait['ports']:
            if port['port'] == 23:
                recommendations.append({
                    'priority': 'critical',
                    'title': '立即关闭 Telnet 服务',
                    'description': 'Telnet 是不安全的明文传输协议，建议立即关闭并使用 SSH 替代',
                })
            if port['port'] == 21:
                recommendations.append({
                    'priority': 'high',
                    'title': '替换 FTP 服务',
                    'description': '标准 FTP 是明文传输，建议使用 SFTP 或 FTPS 替代',
                })
        
        for vuln in portrait['risk_assessment']['vulnerabilities']:
            if vuln['type'] == 'outdated_technology':
                recommendations.append({
                    'priority': vuln['severity'],
                    'title': '升级过时的技术组件',
                    'description': vuln['description'],
                })
        
        for file_info in portrait['sensitive_files']:
            if file_info['severity'] in ['critical', 'high']:
                recommendations.append({
                    'priority': file_info['severity'],
                    'title': f'移除或保护敏感文件: {file_info["path"]}',
                    'description': file_info['description'],
                })
        
        portrait['risk_assessment']['recommendations'] = recommendations
    
    def _version_compare(self, v1, v2):
        def normalize(v):
            parts = []
            for part in v.split('.'):
                try:
                    parts.append(int(part))
                except:
                    parts.append(0)
            return parts
        
        v1_parts = normalize(v1)
        v2_parts = normalize(v2)
        
        max_len = max(len(v1_parts), len(v2_parts))
        
        for i in range(max_len):
            v1_val = v1_parts[i] if i < len(v1_parts) else 0
            v2_val = v2_parts[i] if i < len(v2_parts) else 0
            
            if v1_val < v2_val:
                return -1
            elif v1_val > v2_val:
                return 1
        
        return 0
