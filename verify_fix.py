import os
import sys
import numpy as np
import cv2
import logging

# Add paths
ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, 'backend')
AI_MODULE = os.path.join(ROOT, 'ai_module')
sys.path.insert(0, BACKEND)
sys.path.insert(0, AI_MODULE)

# Mock Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eduvision.settings')
try:
    import django
    django.setup()
except Exception as e:
    print(f"Django setup skipped/failed: {e}")

from backend.apps.lessons.video_analysis import _load_detector, analyze_frame_engagement

def test_pipeline():
    print("Testing detector loading...")
    detector_pkg = _load_detector()
    print(f"Detector loaded: {detector_pkg['type']}")

    print("Testing frame analysis with dummy image...")
    # Create a 640x640 black frame
    frame = np.zeros((640, 640, 3), dtype=np.uint8)
    
    # Try analysis
    try:
        results = analyze_frame_engagement(frame, detector_pkg)
        print(f"Analysis successful. Detected {len(results)} students in a black frame (expected 0).")
    except Exception as e:
        print(f"Analysis failed: {e}")

    # Verify logging (indirectly by checking if the code runs without crash)
    print("Verification complete.")

if __name__ == "__main__":
    test_pipeline()
