from rest_framework import serializers
from .models import ActivityLog, StudentSession


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'lesson', 'temp_student_id', 'timestamp',
            'head_attention_score', 'posture_score',
            'hand_activity_score', 'writing_score', 'motion_score',
            'total_engagement_score', 'activity_label',
        ]


class StudentSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentSession
        fields = ['id', 'lesson', 'temp_student_id', 'first_seen', 'last_seen']
