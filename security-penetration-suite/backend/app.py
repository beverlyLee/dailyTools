from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, resources={
    r"/api/*": {
        "origins": Config.CORS_ORIGINS,
        "supports_credentials": True
    }
})

from blueprints.vuln_scanner import vuln_scanner_bp
from blueprints.asset_analyzer import asset_analyzer_bp

app.register_blueprint(vuln_scanner_bp, url_prefix='/api/vuln-scanner')
app.register_blueprint(asset_analyzer_bp, url_prefix='/api/asset-analyzer')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'service': 'Security Penetration Suite Backend'
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'running',
        'version': '1.0.0',
        'modules': {
            'vuln_scanner': 'enabled',
            'asset_analyzer': 'enabled'
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Not Found',
        'message': 'The requested resource was not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500

def create_app():
    return app

if __name__ == '__main__':
    print("=" * 50)
    print("安全渗透测试工具箱后端服务")
    print("=" * 50)
    print(f"服务地址: http://localhost:5001")
    print(f"API 文档: http://localhost:5001/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True)
