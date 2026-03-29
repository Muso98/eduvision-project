from django.db import models


class Classroom(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'

    name = models.CharField(max_length=200)
    location = models.CharField(max_length=300, blank=True)
    camera_source = models.CharField(max_length=500, help_text='RTSP URL, webcam index, or stream URL')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'classrooms'

    def __str__(self):
        return self.name
