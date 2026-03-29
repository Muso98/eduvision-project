from rest_framework.permissions import BasePermission
from .models import CustomUser


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN


class IsTeacher(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            CustomUser.Role.ADMIN, CustomUser.Role.TEACHER
        ]


class IsObserverOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            CustomUser.Role.ADMIN, CustomUser.Role.TEACHER, CustomUser.Role.OBSERVER
        ]
