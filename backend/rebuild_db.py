import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')

db_path = 'db.sqlite3'
if os.path.exists(db_path):
    try:
        os.remove(db_path)
        print("Deleted old db.sqlite3")
    except Exception as e:
        print(f"Failed to delete db: {e}")

django.setup()
from django.core.management import call_command
from django.contrib.auth import get_user_model

# Run migrations
call_command('migrate')

# Create admin
User = get_user_model()
if not User.objects.filter(email='admin@admin.com').exists():
    User.objects.create_superuser(
        email='admin@admin.com', 
        password='admin', 
        role='admin'
    )
    print("Admin created: admin@admin.com / password: admin")
