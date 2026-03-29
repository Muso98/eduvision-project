from django.db import models
from apps.lessons.models import Lesson
from apps.users.models import Student


class StudentSession(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='student_sessions')
    temp_student_id = models.CharField(max_length=50)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name='sessions')
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_sessions'
        unique_together = ['lesson', 'temp_student_id']

    def __str__(self):
        return f'Session {self.temp_student_id} @ Lesson {self.lesson_id}'


class ActivityLog(models.Model):
    class ActivityLabel(models.TextChoices):
        ACTIVE = 'active', 'Active'
        MODERATE = 'moderate', 'Moderate'
        PASSIVE = 'passive', 'Passive'

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='activity_logs')
    temp_student_id = models.CharField(max_length=50)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    timestamp = models.DateTimeField()
    head_attention_score = models.FloatField(default=0.0)
    posture_score = models.FloatField(default=0.0)
    hand_activity_score = models.FloatField(default=0.0)
    writing_score = models.FloatField(default=0.0)
    motion_score = models.FloatField(default=0.0)
    total_engagement_score = models.FloatField(default=0.0)
    material_score = models.FloatField(default=0.0, null=True, blank=True) # Placeholder for future logic
    behavior_label = models.CharField(max_length=50, null=True, blank=True)
    activity_label = models.CharField(
        max_length=20, choices=ActivityLabel.choices, default=ActivityLabel.PASSIVE
    )
    face_screenshot = models.ImageField(upload_to='face_crops/', null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'activity_logs'
        indexes = [
            models.Index(fields=['lesson', 'timestamp']),
            models.Index(fields=['lesson', 'temp_student_id']),
        ]

    def __str__(self):
        return f'Log {self.temp_student_id} score={self.total_engagement_score}'
