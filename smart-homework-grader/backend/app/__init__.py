from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    
    from .routes import main, essays, classes, analysis
    app.register_blueprint(main)
    app.register_blueprint(essays, url_prefix='/api')
    app.register_blueprint(classes, url_prefix='/api')
    app.register_blueprint(analysis, url_prefix='/api')
    
    with app.app_context():
        db.create_all()
    
    return app
