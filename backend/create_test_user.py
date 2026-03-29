import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
user, created = User.objects.get_or_create(email='admin@example.com')
user.set_password('password')
if hasattr(user, 'role'):
    user.role = 'admin'
user.is_superuser = True
user.is_staff = True
user.save()
print("User admin@example.com created with password 'password', role admin")
