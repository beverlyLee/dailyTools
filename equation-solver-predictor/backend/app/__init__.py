from flask import Flask
from flask_cors import CORS
from .config import Config
from .database import db
from .routers.ode_routes import ode_bp
from .routers.regression_routes import regression_bp
import os

def create_app(config_class=Config):
    """创建 Flask 应用"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 初始化 CORS
    CORS(app, origins=[app.config.get('CORS_ORIGINS', '*')])
    
    # 初始化数据库
    db.init_app(app)
    
    # 注册蓝图
    app.register_blueprint(ode_bp, url_prefix='/api/ode')
    app.register_blueprint(regression_bp, url_prefix='/api/regression')
    
    # 创建数据库表
    with app.app_context():
        # 确保数据目录存在
        data_dir = os.path.join(os.path.dirname(__file__), '../../data')
        os.makedirs(data_dir, exist_ok=True)
        
        # 创建所有表
        db.create_all()
    
    # 健康检查路由
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': '方程求解与数据预测系统运行正常'}
    
    @app.route('/')
    def index():
        return {
            'name': '方程求解与数据预测系统',
            'version': '1.0.0',
            'endpoints': {
                'ode': '/api/ode',
                'regression': '/api/regression'
            }
        }
    
    return app
