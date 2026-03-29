from django.urls import path
from .consumers import StreamConsumer, DashboardConsumer, AlertConsumer

websocket_urlpatterns = [
    path('ws/stream/<int:lesson_id>/', StreamConsumer.as_asgi()),
    path('ws/dashboard/<int:lesson_id>/', DashboardConsumer.as_asgi()),
    path('ws/alerts/<int:lesson_id>/', AlertConsumer.as_asgi()),
]
