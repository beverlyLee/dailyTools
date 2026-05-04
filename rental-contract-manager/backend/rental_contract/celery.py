import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rental_contract.settings')

app = Celery('rental_contract')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-contract-expiry-daily': {
        'task': 'rental_contract.apps.reminders.tasks.check_contract_expiry',
        'schedule': crontab(hour=9, minute=0),  # 每天早上9点执行
    },
    'check-billing-reminders-daily': {
        'task': 'rental_contract.apps.reminders.tasks.check_billing_reminders',
        'schedule': crontab(hour=10, minute=0),  # 每天早上10点执行
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
