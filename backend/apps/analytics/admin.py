from django.contrib import admin
from .models import StudentSession, ActivityLog

@admin.register(StudentSession)
class StudentSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'student_info', 'first_seen', 'last_seen')
    list_filter = ('lesson', 'first_seen')
    search_fields = ('temp_student_id', 'student__first_name', 'student__last_name')
    
    def student_info(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return obj.temp_student_id
    student_info.short_description = 'Student'

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'student_info', 'lesson', 'activity_label', 'total_engagement_score', 'timestamp')
    list_filter = ('activity_label', 'lesson', 'timestamp')
    search_fields = ('temp_student_id', 'student__first_name', 'student__last_name')
    date_hierarchy = 'timestamp'
    readonly_fields = ('head_attention_score', 'posture_score', 'hand_activity_score', 'writing_score', 'motion_score', 'total_engagement_score')

    def student_info(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return obj.temp_student_id
    student_info.short_description = 'Student'
