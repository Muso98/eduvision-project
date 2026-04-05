from celery import shared_task
import subprocess
import os
from django.conf import settings
from .models import Lesson
from django.utils import timezone


@shared_task
def run_video_analysis(lesson_id):
    """
    Background Task: Analyze an uploaded video file for a lesson.
    """
    from .video_processing import process_video_file_task
    from .models import Lesson
    
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        if not lesson.video_file:
            return
        
        video_path = lesson.video_file.path
        
        # Call the processing logic inside the worker
        process_video_file_task(video_path, lesson_id)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"FATAL ERROR in video analysis task: {e}")
