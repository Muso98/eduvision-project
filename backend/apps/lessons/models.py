from django.db import models
from apps.classrooms.models import Classroom
from apps.users.models import CustomUser, StudentGroup


class Subject(models.Model):
    name = models.CharField(max_length=200)
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='subjects')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subjects'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'

    def __str__(self):
        return f'{self.name} ({self.teacher.fullname})'


class Lesson(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        ACTIVE = 'active', 'Active'
        ENDED = 'ended', 'Ended'

    title = models.CharField(max_length=300)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='lessons')
    teacher = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='lessons')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='lessons', null=True, blank=True)
    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name='lessons', null=True, blank=True)
    video_file = models.FileField(upload_to='lesson_videos/', null=True, blank=True, help_text='Upload a video to analyze instead of camera')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lessons'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} [{self.status}]'
