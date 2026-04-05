import os
import requests
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Fetches AI models (YOLOv8n weights) into the ai_module directory'

    def handle(self, *args, **options):
        # Determine ai_module directory
        # In Docker: /app/ai_module
        # Locally: backend/../ai_module
        base_dir = settings.BASE_DIR
        ai_module_dir = os.path.join(base_dir, 'ai_module')
        
        if not os.path.exists(ai_module_dir):
            self.stdout.write(self.style.WARNING(f"Creating ai_module directory at {ai_module_dir}"))
            os.makedirs(ai_module_dir, exist_ok=True)

        model_url = "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
        target_path = os.path.join(ai_module_dir, 'yolov8n.pt')

        if os.path.exists(target_path):
            self.stdout.write(self.style.SUCCESS(f"Model already exists at {target_path}"))
            return

        self.stdout.write(f"Downloading YOLOv8n model from {model_url}...")
        try:
            response = requests.get(model_url, stream=True, timeout=60)
            response.raise_for_status()
            
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            self.stdout.write(self.style.SUCCESS(f"Successfully downloaded model to {target_path}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Failed to download model: {e}"))
            # Fallback: try to let ultralytics handle it if it's installed
            try:
                from ultralytics import YOLO
                self.stdout.write("Attempting fallback download via ultralytics...")
                YOLO("yolov8n.pt") # This downloads to CWD or ~/config
                self.stdout.write(self.style.WARNING("Model downloaded via ultralytics but might not be in ai_module/"))
            except ImportError:
                pass
