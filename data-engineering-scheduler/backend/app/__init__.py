from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app(config_class=None):
    app = Flask(__name__)
    
    env = os.getenv('FLASK_ENV', 'development')
    
    if config_class:
        app.config.from_object(config_class)
    else:
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
        
        if env == 'development' or os.getenv('USE_SQLITE', 'true').lower() == 'true':
            basedir = os.path.abspath(os.path.dirname(__file__))
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '../data.db')
        else:
            app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
                'DATABASE_URL',
                'postgresql+psycopg2://airflow:airflow@localhost:5432/airflow'
            )
        
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ECHO'] = env == 'development'
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    
    from app.routes.dags import dags_bp
    from app.routes.quality import quality_bp
    from app.routes.connections import connections_bp
    from app.routes.settings import settings_bp
    
    app.register_blueprint(dags_bp, url_prefix='/api')
    app.register_blueprint(quality_bp, url_prefix='/api')
    app.register_blueprint(connections_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api')
    
    with app.app_context():
        db.create_all()
    
    return app
