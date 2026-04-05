import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

email = 'admin@eduvision.com'
password = 'Admin123!'

try:
    if User.objects.filter(email=email).exists():
        User.objects.filter(email=email).delete()
        print(f"Old admin deleted.")
    
    User.objects.create_superuser(email=email, password=password, fullname="Super Admin")
    print(f"SUCCESS: Admin created! Email: {email} | Password: {password}")
except Exception as e:
    print(f"ERROR: {e}")
