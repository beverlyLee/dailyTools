from flask import Blueprint, jsonify

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return jsonify({
        'message': '中文作文智能批改系统 API',
        'version': '1.0.0',
        'status': 'running'
    })

@main.route('/health')
def health_check():
    return jsonify({'status': 'healthy'})
