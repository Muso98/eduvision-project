from rest_framework import serializers
from .models import Lesson
from apps.classrooms.serializers import ClassroomSerializer
from apps.users.serializers import UserSerializer


class LessonSerializer(serializers.ModelSerializer):
    classroom_detail = ClassroomSerializer(source='classroom', read_only=True)
    teacher_detail = UserSerializer(source='teacher', read_only=True)

    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'classroom', 'classroom_detail',
            'teacher', 'teacher_detail',
            'start_time', 'end_time', 'status', 'is_processing', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'start_time', 'end_time', 'status', 'is_processing']


class StartLessonSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=300)
    classroom_id = serializers.IntegerField()
    subject_id = serializers.IntegerField(required=False)
    group_id = serializers.IntegerField(required=False)
    video_file = serializers.FileField(required=False)
