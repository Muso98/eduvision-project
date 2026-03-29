from django.contrib import admin
from django.utils.html import format_html
from .models import Subject, Lesson

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'teacher', 'created_at')
    list_filter = ('teacher', 'created_at')
    search_fields = ('name', 'teacher__email')
    autocomplete_fields = ['teacher']

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'subject', 'group', 'teacher', 'classroom', 'status_badge', 'start_time', 'end_time')
    list_filter = ('status', 'subject', 'group', 'teacher', 'classroom', 'start_time')
    search_fields = ('title', 'teacher__email', 'subject__name', 'group__name')
    date_hierarchy = 'start_time'
    list_per_page = 20

    def status_badge(self, obj):
        colors = {
            'active': 'success',
            'ended': 'warning',
            'scheduled': 'info'
        }
        color = colors.get(obj.status, 'info')
        return format_html('<span class="custom-badge badge-{}">{}</span>', color, obj.get_status_display())
    status_badge.short_description = 'Status'
