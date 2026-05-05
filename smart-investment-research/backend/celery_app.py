from celery import Celery
from config import config

def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=config.CELERY_BROKER_URL,
        backend=config.CELERY_RESULT_BACKEND
    )
    
    celery.conf.update(app.config)
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

from app import app
celery = make_celery(app)

from tasks import news_scraper, sentiment_analysis
