from flask import Blueprint, jsonify, request
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vuln_scanner.crawler import WebCrawler
from vuln_scanner.sqli_detector import SQLiDetector
from vuln_scanner.xss_detector import XSSDetector
from vuln_scanner.csrf_detector import CSRFDetector
from vuln_scanner.weak_password import WeakPasswordDetector

vuln_scanner_bp = Blueprint('vuln_scanner', __name__)

@vuln_scanner_bp.route('/scan', methods=['POST'])
def start_scan():
    try:
        data = request.get_json()
        
        if not data or 'targetUrl' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        target_url = data.get('targetUrl')
        depth = data.get('depth', 2)
        threads = data.get('threads', 5)
        vuln_types = data.get('vulnTypes', ['sql_injection', 'xss', 'weak_password'])
        cookie = data.get('cookie', '')
        user_agent = data.get('userAgent', 'SecurityScanner/1.0')
        timeout = data.get('timeout', 10)
        
        scan_config = {
            'target_url': target_url,
            'depth': depth,
            'threads': threads,
            'vuln_types': vuln_types,
            'cookie': cookie,
            'user_agent': user_agent,
            'timeout': timeout
        }
        
        return jsonify({
            'success': True,
            'message': 'Scan task submitted',
            'scan_id': datetime.now().strftime('%Y%m%d%H%M%S'),
            'config': scan_config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/crawl', methods=['POST'])
def crawl():
    try:
        data = request.get_json()
        target_url = data.get('targetUrl')
        depth = data.get('depth', 2)
        
        if not target_url:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        crawler = WebCrawler(target_url, max_depth=depth)
        links = crawler.crawl()
        
        return jsonify({
            'success': True,
            'total_links': len(links),
            'links': [{'url': link, 'visited': True} for link in links]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/test-sqli', methods=['POST'])
def test_sqli():
    try:
        data = request.get_json()
        target_url = data.get('targetUrl')
        params = data.get('params', {})
        
        if not target_url:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        detector = SQLiDetector()
        results = detector.detect(target_url, params)
        
        return jsonify({
            'success': True,
            'vulnerable': len(results) > 0,
            'findings': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/test-xss', methods=['POST'])
def test_xss():
    try:
        data = request.get_json()
        target_url = data.get('targetUrl')
        params = data.get('params', {})
        
        if not target_url:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        detector = XSSDetector()
        results = detector.detect(target_url, params)
        
        return jsonify({
            'success': True,
            'vulnerable': len(results) > 0,
            'findings': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/test-csrf', methods=['POST'])
def test_csrf():
    try:
        data = request.get_json()
        target_url = data.get('targetUrl')
        
        if not target_url:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        detector = CSRFDetector()
        results = detector.detect(target_url)
        
        return jsonify({
            'success': True,
            'vulnerable': results.get('vulnerable', False),
            'findings': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/test-weak-password', methods=['POST'])
def test_weak_password():
    try:
        data = request.get_json()
        target_url = data.get('targetUrl')
        login_endpoint = data.get('loginEndpoint', '/login')
        username_param = data.get('usernameParam', 'username')
        password_param = data.get('passwordParam', 'password')
        usernames = data.get('usernames', ['admin', 'root', 'test'])
        
        if not target_url:
            return jsonify({
                'success': False,
                'error': 'Missing target URL'
            }), 400
        
        detector = WeakPasswordDetector()
        results = detector.detect(
            target_url + login_endpoint,
            username_param,
            password_param,
            usernames
        )
        
        return jsonify({
            'success': True,
            'found_credentials': len(results) > 0,
            'credentials': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@vuln_scanner_bp.route('/status/<scan_id>', methods=['GET'])
def get_scan_status(scan_id):
    return jsonify({
        'success': True,
        'scan_id': scan_id,
        'status': 'completed',
        'progress': 100,
        'vulnerabilities_found': 0
    })
