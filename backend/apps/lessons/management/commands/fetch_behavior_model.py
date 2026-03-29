"""
Download student_behavior.pt from Roboflow into ai_module.

Usage:
  set ROBOFLOW_API_KEY in environment, then:
  python manage.py fetch_behavior_model

Or pass the key once:
  python manage.py fetch_behavior_model --api-key YOUR_KEY
"""
import os
import sys

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Downloads student_behavior.pt (YOLO behavior classes) into ai_module/'

    def add_arguments(self, parser):
        parser.add_argument(
            '--api-key',
            dest='api_key',
            default='',
            help='Roboflow API key (default: ROBOFLOW_API_KEY env)',
        )

    def handle(self, *args, **options):
        api_key = (options.get('api_key') or '').strip() or os.environ.get('ROBOFLOW_API_KEY', '').strip()
        if not api_key:
            raise CommandError(
                'Roboflow API key kerak: ROBOFLOW_API_KEY muhit o‘zgaruvchisi yoki --api-key'
            )

        here = os.path.abspath(__file__)
        backend_dir = here
        for _ in range(5):
            backend_dir = os.path.dirname(backend_dir)
        # Local dev: ai_module is repo sibling of backend/. Docker: COPY ai_module → /app/ai_module
        embedded = os.path.join(backend_dir, 'ai_module')
        if os.path.isdir(embedded):
            ai_module = embedded
        else:
            repo_root = os.path.normpath(os.path.join(backend_dir, '..'))
            ai_module = os.path.join(repo_root, 'ai_module')
        dl = os.path.join(ai_module, 'download_behavior_model.py')
        if not os.path.isfile(dl):
            raise CommandError(f'ai_module topilmadi: {ai_module}')

        if ai_module not in sys.path:
            sys.path.insert(0, ai_module)

        from download_behavior_model import download_student_behavior_model

        path = download_student_behavior_model(api_key, dest_dir=ai_module)
        if not path:
            raise CommandError('Model yuklanmadi — xatolarni yuqorida ko‘ring.')

        try:
            from apps.lessons.video_analysis import reset_analysis_caches
            reset_analysis_caches()
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS(f'Tayyor: {path}'))
        self.stdout.write('Keyingi so‘rovda behavior detektori avtomatik yuklanadi (yoki serverni qayta ishga tushiring).')
