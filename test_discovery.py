import os
import sys
import logging

# Add ai_module to path
_AI_MODULE = os.path.join(os.getcwd(), 'ai_module')
sys.path.insert(0, _AI_MODULE)

print(f"Current working directory: {os.getcwd()}")
print(f"AI Module path: {_AI_MODULE}")

try:
    from ultralytics import YOLO
    print("Ultralytics imported successfully")
    model_path = os.path.join(_AI_MODULE, 'yolov8n.pt')
    if os.path.exists(model_path):
        print(f"Model found at {model_path}")
        model = YOLO(model_path)
        print("Model loaded successfully")
    else:
        print(f"Model NOT found at {model_path}")
except Exception as e:
    print(f"Error importing/loading YOLO: {e}")

try:
    import cv2
    print(f"OpenCV version: {cv2.__version__}")
except Exception as e:
    print(f"OpenCV error: {e}")

try:
    import mediapipe as mp
    print(f"MediaPipe version: {mp.__version__}")
except Exception as e:
    print(f"MediaPipe error: {e}")
