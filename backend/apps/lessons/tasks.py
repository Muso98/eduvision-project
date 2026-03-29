from celery import shared_task
import subprocess
import os
from django.conf import settings
from .models import Lesson
from django.utils import timezone


@shared_task
def run_video_analysis(lesson_id):
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        if not lesson.video_file:
            return
        
        video_path = lesson.video_file.path
        
        backend_dir = settings.BASE_DIR
        project_dir = backend_dir.parent
        ai_module_dir = os.path.join(project_dir, 'ai_module')
        pipeline_script = os.path.join(ai_module_dir, 'pipeline.py')
        python_exec = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
        
        # Run AI pipeline synchronously for this celery worker
        subprocess.run([
            python_exec,
            pipeline_script,
            '--lesson-id', str(lesson_id),
            '--source', video_path,
        ], cwd=ai_module_dir)
        
        # Once analysis is complete, stop the lesson
        lesson.status = Lesson.Status.ENDED
        lesson.end_time = timezone.now()
        lesson.save()
        
        # Trigger report generation
        from apps.reports.tasks import generate_lesson_report
        generate_lesson_report.delay(lesson.id)
        
        # Notify clients
        from .views import broadcast_lesson_update
        broadcast_lesson_update(lesson.id, 'lesson.ended', {'lesson_id': lesson.id})

    except Exception as e:
        print(f"Error in video analysis: {e}")
