from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Lesson
from .serializers import LessonSerializer, StartLessonSerializer
from apps.users.permissions import IsTeacher, IsObserverOrAbove
from apps.classrooms.models import Classroom
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json


def broadcast_lesson_update(lesson_id, event_type, data):
    """Broadcast a message to the lesson's dashboard channel group."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'dashboard_{lesson_id}',
        {'type': event_type, 'data': data}
    )


class LessonListView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request):
        qs = Lesson.objects.select_related('classroom', 'teacher')
        # Teachers see only their lessons
        if request.user.role == 'teacher':
            qs = qs.filter(teacher=request.user)
        serializer = LessonSerializer(qs, many=True)
        return Response(serializer.data)


class LessonStartView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request):
        serializer = StartLessonSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            classroom = Classroom.objects.get(pk=serializer.validated_data['classroom_id'])
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if classroom already has an active lesson
        if Lesson.objects.filter(classroom=classroom, status=Lesson.Status.ACTIVE).exists():
            return Response(
                {'error': 'Classroom already has an active lesson'},
                status=status.HTTP_400_BAD_REQUEST
            )

        lesson = Lesson.objects.create(
            title=serializer.validated_data['title'],
            classroom=classroom,
            teacher=request.user,
            start_time=timezone.now(),
            status=Lesson.Status.ACTIVE,
            subject_id=serializer.validated_data.get('subject_id'),
            group_id=serializer.validated_data.get('group_id'),
            video_file=serializer.validated_data.get('video_file')
        )

        if lesson.video_file:
            from .tasks import run_video_analysis
            run_video_analysis.delay(lesson.id)

        return Response(LessonSerializer(lesson).data, status=status.HTTP_201_CREATED)


class LessonStopView(APIView):
    permission_classes = [IsObserverOrAbove]

    def post(self, request, pk):
        try:
            if request.user.role in ['admin', 'manager']:
                lesson = Lesson.objects.get(pk=pk)
            else:
                lesson = Lesson.objects.get(pk=pk, teacher=request.user)
        except Lesson.DoesNotExist:
            return Response({'error': 'Active lesson not found or access denied'}, status=status.HTTP_404_NOT_FOUND)

        if lesson.status == Lesson.Status.ENDED:
            return Response(LessonSerializer(lesson).data)

        lesson.status = Lesson.Status.ENDED
        lesson.end_time = timezone.now()
        lesson.save()

        # Trigger report generation synchronously
        from apps.reports.tasks import generate_lesson_report
        generate_lesson_report(lesson.id)

        # Notify dashboard clients
        broadcast_lesson_update(lesson.id, 'lesson.ended', {'lesson_id': lesson.id})

        return Response(LessonSerializer(lesson).data)


class LessonDetailView(APIView):
    permission_classes = [IsObserverOrAbove]

    def get(self, request, pk):
        qs = Lesson.objects.select_related('classroom', 'teacher')
        if request.user.role == 'teacher':
            qs = qs.filter(teacher=request.user)
            
        try:
            lesson = qs.get(pk=pk)
        except Lesson.DoesNotExist:
            return Response({'error': 'Not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
        return Response(LessonSerializer(lesson).data)


class LessonStudentsAPIView(APIView):
    # This is publicly accessible or secured by a specific token for the AI module
    def get(self, request, pk):
        try:
            lesson = Lesson.objects.get(pk=pk)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not lesson.group:
            return Response([])

        students = lesson.group.students.all()
        data = []
        for s in students:
            if s.photo:
                data.append({
                    'id': f"db_{s.id}",
                    'first_name': s.first_name,
                    'last_name': s.last_name,
                    'photo_url': request.build_absolute_uri(s.photo.url)
                })
        return Response(data)
