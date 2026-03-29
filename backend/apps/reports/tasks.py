"""
Celery task: Generate lesson report after lesson ends.
"""
from celery import shared_task
from django.db.models import Avg
from django.utils import timezone


@shared_task
def generate_lesson_report(lesson_id: int):
    from apps.lessons.models import Lesson
    from apps.analytics.models import ActivityLog
    from .models import LessonReport

    try:
        lesson = Lesson.objects.get(pk=lesson_id)
    except Lesson.DoesNotExist:
        return

    logs = ActivityLog.objects.filter(lesson=lesson)
    if not logs.exists():
        # No activity data, create empty report
        LessonReport.objects.update_or_create(
            lesson=lesson,
            defaults={
                'avg_engagement': 0,
                'active_count': 0,
                'passive_count': 0,
                'moderate_count': 0,
                'total_students_detected': 0,
                'summary': 'No activity data was recorded for this lesson.',
            }
        )
        return

    # Student-based statistics
    student_stats = ActivityLog.objects.filter(lesson=lesson).values('temp_student_id').annotate(avg=Avg('total_engagement_score'))
    
    active_count = 0
    moderate_count = 0
    passive_count = 0
    
    for stat in student_stats:
        val = stat['avg'] or 0
        if val >= 75:
            active_count += 1
        elif val >= 40:
            moderate_count += 1
        else:
            passive_count += 1

    avg_engagement = logs.aggregate(avg=Avg('total_engagement_score'))['avg'] or 0
    total_students = student_stats.count()

    # Find peak (highest avg in a 5-min window) and low engagement time
    peak_log = logs.order_by('-total_engagement_score').first()
    low_log = logs.order_by('total_engagement_score').first()

    duration_minutes = 0
    if lesson.start_time and lesson.end_time:
        duration_minutes = int((lesson.end_time - lesson.start_time).total_seconds() / 60)

    summary = (
        f"Lesson '{lesson.title}' lasted {duration_minutes} minutes. "
        f"Average engagement: {avg_engagement:.1f}%. "
        f"Active: {active_count} students, Passive: {passive_count} students, Moderate: {moderate_count} students. "
        f"Total unique students detected: {total_students}."
    )

    LessonReport.objects.update_or_create(
        lesson=lesson,
        defaults={
            'avg_engagement': round(avg_engagement, 2),
            'active_count': active_count,
            'passive_count': passive_count,
            'moderate_count': moderate_count,
            'peak_engagement_time': peak_log.timestamp if peak_log else None,
            'low_engagement_time': low_log.timestamp if low_log else None,
            'total_students_detected': total_students,
            'summary': summary,
        }
    )
