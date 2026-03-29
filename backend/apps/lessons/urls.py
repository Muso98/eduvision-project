from django.urls import path
from .views import LessonListView, LessonStartView, LessonStopView, LessonDetailView, LessonStudentsAPIView
from .video_analysis import VideoAnalysisView

urlpatterns = [
    path('', LessonListView.as_view(), name='lesson-list'),
    path('start/', LessonStartView.as_view(), name='lesson-start'),
    path('<int:pk>/stop/', LessonStopView.as_view(), name='lesson-stop'),
    path('<int:pk>/', LessonDetailView.as_view(), name='lesson-detail'),
    path('<int:pk>/students/', LessonStudentsAPIView.as_view(), name='lesson-students'),
    path('<int:lesson_id>/analyze-video/', VideoAnalysisView.as_view(), name='lesson-analyze-video'),
    path('analyze-video/', VideoAnalysisView.as_view(), name='analyze-video-standalone'),
]
