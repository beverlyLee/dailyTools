import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    FLASK_APP = os.getenv('FLASK_APP', 'app.py')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    PORT = int(os.getenv('FLASK_PORT', '5001'))
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
    OPENAI_EMBEDDING_MODEL = os.getenv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
    
    MAX_TOKENS = int(os.getenv('MAX_TOKENS', '4000'))
    TEMPERATURE = float(os.getenv('TEMPERATURE', '0.7'))
    
    CHROMA_PERSIST_DIRECTORY = os.getenv(
        'CHROMA_PERSIST_DIRECTORY',
        os.path.join(os.path.dirname(__file__), 'data', 'vector_store')
    )
    
    FEEDBACK_STORAGE_PATH = os.getenv(
        'FEEDBACK_STORAGE_PATH',
        os.path.join(os.path.dirname(__file__), 'data', 'feedbacks.json')
    )
    
    PROMPT_TEMPLATES_PATH = os.getenv(
        'PROMPT_TEMPLATES_PATH',
        os.path.join(os.path.dirname(__file__), 'prompts')
    )


config = Config()
