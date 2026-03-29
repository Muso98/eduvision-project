import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
django.setup()

from apps.reports.tasks import generate_lesson_report
from apps.reports.models import LessonReport

reports = LessonReport.objects.all()
print(f"Recalculating {reports.count()} reports...")

for r in reports:
    print(f"Updating report for Lesson {r.lesson_id}...")
    generate_lesson_report(r.lesson_id)

print("Done!")
