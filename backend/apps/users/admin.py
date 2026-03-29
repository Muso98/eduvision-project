from django.contrib import admin
from django import forms
from django.utils.html import format_html
from .models import CustomUser, StudentGroup, Student

class CustomUserCreationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': 'Strong Password'}))

    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'fullname', 'role', 'password', 'photo')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if self.cleaned_data['role'] == CustomUser.Role.ADMIN:
            user.is_staff = True
            user.is_superuser = True
        elif self.cleaned_data['role'] == CustomUser.Role.TEACHER:
            user.is_staff = True

        if commit:
            user.save()
        return user

class CustomUserChangeForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'fullname', 'role', 'is_active', 'is_staff', 'photo')

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'fullname', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['email', 'fullname']
    ordering = ['email']

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            return CustomUserCreationForm
        return CustomUserChangeForm

class StudentInline(admin.TabularInline):
    model = Student
    extra = 1

@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'student_count')
    search_fields = ('name',)
    inlines = [StudentInline]

    def student_count(self, obj):
        return obj.students.count()
    student_count.short_description = 'Students'

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'group', 'photo_preview', 'created_at')
    list_display_links = ('id', 'first_name', 'last_name')
    list_filter = ('group', 'created_at')
    search_fields = ('first_name', 'last_name', 'group__name')
    readonly_fields = ('photo_preview',)

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" class="rounded-avatar" />', obj.photo.url)
        return "-"
    photo_preview.short_description = 'Photo'
