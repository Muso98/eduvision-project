from rest_framework import serializers
from .models import LessonReport


class LessonReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonReport
        fields = [
            'id', 'lesson', 'avg_engagement', 'active_count',
            'passive_count', 'moderate_count', 'peak_engagement_time',
            'low_engagement_time', 'total_students_detected', 'summary', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
