from django.contrib import admin
from django.utils.html import format_html
from .models import LessonReport

@admin.register(LessonReport)
class LessonReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'lesson', 'engagement_bar', 'active_count', 'passive_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('lesson__title',)
    date_hierarchy = 'created_at'
    readonly_fields = ('avg_engagement', 'active_count', 'passive_count', 'moderate_count', 'peak_engagement_time', 'low_engagement_time', 'total_students_detected', 'summary')

    def engagement_bar(self, obj):
        fill = "rgba(16, 185, 129, 0.85)" if obj.avg_engagement >= 70 else "rgba(245, 158, 11, 0.85)" if obj.avg_engagement >= 40 else "rgba(239, 68, 68, 0.85)"
        return format_html(
            '<div style="min-width: 140px; display:flex; align-items:center;">'
            '<div class="progress-bg"><div class="progress-fill" style="width: {}%; background: {};"></div></div>'
            '<strong style="font-size: 0.85rem; color: #cbd5e1;">{}%</strong>'
            '</div>', 
            obj.avg_engagement, fill, f"{obj.avg_engagement:.1f}"
        )
    engagement_bar.short_description = 'Avg Engagement'
    list_filter = ('created_at',)
    search_fields = ('lesson__title',)
    date_hierarchy = 'created_at'
    readonly_fields = ('avg_engagement', 'active_count', 'passive_count', 'moderate_count', 'peak_engagement_time', 'low_engagement_time', 'total_students_detected', 'summary')
