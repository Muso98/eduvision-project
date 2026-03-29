import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
django.setup()

from apps.lessons.models import Lesson
from apps.reports.tasks import generate_lesson_report
from django.utils import timezone

try:
    lesson = Lesson.objects.get(pk=16)
    print(f"Stopping lesson: {lesson.id} - {lesson.title}")
    
    lesson.status = Lesson.Status.ENDED
    lesson.end_time = timezone.now()
    lesson.save()
    
    print("Generating report...")
    generate_lesson_report(lesson.id)
    print("Successfully generated report.")
except Exception as e:
    import traceback
    traceback.print_exc()
