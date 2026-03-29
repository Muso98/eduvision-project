from rest_framework import serializers
from .models import Classroom


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = ['id', 'name', 'location', 'camera_source', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
