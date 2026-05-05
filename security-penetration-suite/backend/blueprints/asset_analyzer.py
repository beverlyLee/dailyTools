from flask import Blueprint, jsonify, request
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from asset_analyzer.port_scanner import PortScanner
from asset_analyzer.service_fingerprint import ServiceFingerprint
from asset_analyzer.sensitive_file_detector import SensitiveFileDetector
from asset_analyzer.tech_stack_detector import TechStackDetector
from asset_analyzer.asset_portrait import AssetPortrait

asset_analyzer_bp = Blueprint('asset_analyzer', __name__)

@asset_analyzer_bp.route('/analyze', methods=['POST'])
def start_analysis():
    try:
        data = request.get_json()
        
        if not data or 'target' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        target = data.get('target')
        port_range = data.get('portRange', 'common')
        custom_ports = data.get('customPorts', '')
        scan_types = data.get('scanTypes', ['port_scan', 'service_fingerprint', 'sensitive_files', 'tech_stack'])
        timeout = data.get('timeout', 5)
        threads = data.get('threads', 20)
        skip_verified = data.get('skipVerified', True)
        
        analyze_config = {
            'target': target,
            'port_range': port_range,
            'custom_ports': custom_ports,
            'scan_types': scan_types,
            'timeout': timeout,
            'threads': threads,
            'skip_verified': skip_verified
        }
        
        return jsonify({
            'success': True,
            'message': 'Analysis task submitted',
            'analysis_id': datetime.now().strftime('%Y%m%d%H%M%S'),
            'config': analyze_config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/port-scan', methods=['POST'])
def port_scan():
    try:
        data = request.get_json()
        target = data.get('target')
        port_range = data.get('portRange', 'common')
        custom_ports = data.get('customPorts', '')
        timeout = data.get('timeout', 5)
        threads = data.get('threads', 20)
        
        if not target:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        scanner = PortScanner(timeout=timeout, max_threads=threads)
        ports = scanner._get_ports(port_range, custom_ports)
        results = scanner.scan(target, ports)
        
        return jsonify({
            'success': True,
            'target': target,
            'total_ports_scanned': len(ports),
            'open_ports': results['open_ports'],
            'closed_ports': results['closed_ports'],
            'open_ports_count': len(results['open_ports']),
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/service-fingerprint', methods=['POST'])
def service_fingerprint():
    try:
        data = request.get_json()
        target = data.get('target')
        ports = data.get('ports', [])
        timeout = data.get('timeout', 5)
        
        if not target:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        if not ports:
            return jsonify({
                'success': False,
                'error': 'Missing ports to scan'
            }), 400
        
        fingerprinter = ServiceFingerprint(timeout=timeout)
        results = []
        
        for port in ports:
            service_info = fingerprinter.identify(target, port)
            if service_info:
                results.append(service_info)
        
        return jsonify({
            'success': True,
            'target': target,
            'services': results,
            'services_found': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/sensitive-files', methods=['POST'])
def sensitive_files():
    try:
        data = request.get_json()
        target = data.get('target')
        custom_paths = data.get('customPaths', [])
        timeout = data.get('timeout', 5)
        threads = data.get('threads', 10)
        
        if not target:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        detector = SensitiveFileDetector(timeout=timeout, max_threads=threads)
        results = detector.detect(target, custom_paths)
        
        return jsonify({
            'success': True,
            'target': target,
            'total_paths_checked': len(detector.sensitive_paths) + len(custom_paths),
            'sensitive_files_found': results,
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/tech-stack', methods=['POST'])
def tech_stack():
    try:
        data = request.get_json()
        target = data.get('target')
        timeout = data.get('timeout', 5)
        
        if not target:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        detector = TechStackDetector(timeout=timeout)
        results = detector.detect(target)
        
        return jsonify({
            'success': True,
            'target': target,
            'tech_stack': results,
            'technologies_found': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/asset-portrait', methods=['POST'])
def asset_portrait():
    try:
        data = request.get_json()
        target = data.get('target')
        scan_data = data.get('scanData', {})
        
        if not target:
            return jsonify({
                'success': False,
                'error': 'Missing target'
            }), 400
        
        asset_portrait_builder = AssetPortrait()
        portrait = asset_portrait_builder.build_portrait(target, scan_data)
        
        return jsonify({
            'success': True,
            'target': target,
            'portrait': portrait
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@asset_analyzer_bp.route('/status/<analysis_id>', methods=['GET'])
def get_analysis_status(analysis_id):
    return jsonify({
        'success': True,
        'analysis_id': analysis_id,
        'status': 'completed',
        'progress': 100,
        'findings': {
            'open_ports': 0,
            'services': 0,
            'sensitive_files': 0,
            'technologies': 0
        }
    })
