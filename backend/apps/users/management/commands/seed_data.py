"""
Management command to seed initial data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from apps.users.models import CustomUser
from apps.classrooms.models import Classroom


class Command(BaseCommand):
    help = 'Seeds initial admin user and sample classroom'

    def handle(self, *args, **options):
        # Admin user
        if not CustomUser.objects.filter(email='admin@eduvision.local').exists():
            CustomUser.objects.create_superuser(
                email='admin@eduvision.local',
                password='Admin123!',
                fullname='System Admin',
                role=CustomUser.Role.ADMIN,
            )
            self.stdout.write(self.style.SUCCESS('✓ Admin created: admin@eduvision.local / Admin123!'))
        else:
            self.stdout.write('Admin already exists.')

        # Teacher
        if not CustomUser.objects.filter(email='teacher@eduvision.local').exists():
            CustomUser.objects.create_user(
                email='teacher@eduvision.local',
                password='Teacher123!',
                fullname='Demo Teacher',
                role=CustomUser.Role.TEACHER,
            )
            self.stdout.write(self.style.SUCCESS('✓ Teacher created: teacher@eduvision.local / Teacher123!'))

        # Observer
        if not CustomUser.objects.filter(email='observer@eduvision.local').exists():
            CustomUser.objects.create_user(
                email='observer@eduvision.local',
                password='Observer123!',
                fullname='Demo Observer',
                role=CustomUser.Role.OBSERVER,
            )
            self.stdout.write(self.style.SUCCESS('✓ Observer created: observer@eduvision.local / Observer123!'))

        # Classrooms
        if not Classroom.objects.exists():
            rooms = [
                {'name': 'Xona 101', 'location': '1-qavat, A blok', 'camera_source': '0'},
                {'name': 'Xona 202', 'location': '2-qavat, B blok', 'camera_source': 'rtsp://192.168.1.100/stream'},
                {'name': 'Konferens zal', 'location': 'Asosiy bino', 'camera_source': '1'},
            ]
            for room in rooms:
                Classroom.objects.create(**room)
            self.stdout.write(self.style.SUCCESS(f'✓ {len(rooms)} classrooms created.'))

        self.stdout.write(self.style.SUCCESS('\n✅ Seed data complete!'))
