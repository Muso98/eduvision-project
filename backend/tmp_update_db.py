import os
import sys

# Ensure backend path is in sys.path
sys.path.append('d:/Projects for clients/EduVision Classroom Analytics Platform/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')

import django
django.setup()

from apps.users.models import Student, StudentGroup
from apps.lessons.models import Lesson

g, _ = StudentGroup.objects.get_or_create(name='Group A 204')
s, created = Student.objects.update_or_create(
    first_name='Lutfulla', 
    last_name='Murodjonov', 
    defaults={'group': g}
)
if not s.photo:
    s.photo = 'students/photo_2026-01-05_14-35-49.jpg'
    s.save()

try:
    l = Lesson.objects.get(id=9)
    l.group = g
    l.status = 'active'
    l.save()
    print('SUCCESS: Student and Lesson 9 updated')
except Lesson.DoesNotExist:
    print('ERROR: Lesson 9 not found')
