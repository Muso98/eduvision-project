from django.db import models
from apps.lessons.models import Lesson


class LessonReport(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='report')
    avg_engagement = models.FloatField(default=0.0)
    active_count = models.IntegerField(default=0)
    passive_count = models.IntegerField(default=0)
    moderate_count = models.IntegerField(default=0)
    peak_engagement_time = models.DateTimeField(null=True, blank=True)
    low_engagement_time = models.DateTimeField(null=True, blank=True)
    total_students_detected = models.IntegerField(default=0)
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lesson_reports'

    def __str__(self):
        return f'Report for Lesson {self.lesson_id}'
