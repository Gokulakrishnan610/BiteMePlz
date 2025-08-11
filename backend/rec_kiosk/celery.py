import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

app = Celery('rec_kiosk')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks() 

# Centralize beat schedule here to avoid per-module app instances
app.conf.beat_schedule = {
    'expire-orders-every-minute': {
        'task': 'api.tasks.expire_orders_and_handle_refund',
        'schedule': crontab(),  # every minute
    },
}