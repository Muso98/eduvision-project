from django.urls import path
from .views import LessonReportView, LessonReportListView, LessonReportCsvExportView, LessonReportPdfExportView

urlpatterns = [
    path('', LessonReportListView.as_view(), name='report-list'),
    path('<int:lesson_id>/', LessonReportView.as_view(), name='lesson-report'),
    path('<int:lesson_id>/export/csv/', LessonReportCsvExportView.as_view(), name='lesson-report-csv'),
    path('<int:lesson_id>/export/pdf/', LessonReportPdfExportView.as_view(), name='lesson-report-pdf'),
]
