from django.contrib import admin
from .models import Classroom

@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'location', 'camera_source')
    ordering = ('name',)
