from flask import Flask, jsonify, request
from flask_cors import CORS
from config import config
import json

app = Flask(__name__)
app.config.from_object(config)
CORS(app)

from routes.sentiment_routes import sentiment_bp
from routes.industry_routes import industry_bp

app.register_blueprint(sentiment_bp, url_prefix='/api/sentiment')
app.register_blueprint(industry_bp, url_prefix='/api/industry')

@app.route('/')
def index():
    return jsonify({
        'message': '智能投研与舆情分析系统 API',
        'version': '1.0.0',
        'endpoints': {
            'sentiment': '/api/sentiment',
            'industry': '/api/industry'
        }
    })

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': '系统运行正常'
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
