"""
Celery configuration for EduVision.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
app = Celery('eduvision')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
