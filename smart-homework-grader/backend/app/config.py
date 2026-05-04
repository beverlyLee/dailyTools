import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'smart-homework-grader-secret-key'
    
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = os.environ.get('MYSQL_PORT') or '3306'
    MYSQL_DB = os.environ.get('MYSQL_DB') or 'smart_homework_grader'
    
    SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    
    NLP_ENGINE = os.environ.get('NLP_ENGINE') or 'thunlp'
    LTP_MODEL_PATH = os.environ.get('LTP_MODEL_PATH') or './models/ltp'
    
    OCR_ENGINE = os.environ.get('OCR_ENGINE') or 'tesseract'
