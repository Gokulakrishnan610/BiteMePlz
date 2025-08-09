import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

app = Celery('rec_kiosk')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks() 