"""
BehaviorDetector — Student Behavior / Posture Classification

Loads a YOLOv8 model trained on the Roboflow student-behavior dataset
(https://universe.roboflow.com/class-t58ex/student-behavior).

Expected model location: ai_module/student_behavior.pt

Behavior classes and their engagement mapping:
  - looking_forward / listening → HIGH engagement (active)
  - raising_hand               → HIGH engagement (active)
  - reading / writing          → MEDIUM engagement (moderate)
  - thinking                   → MEDIUM engagement (moderate)
  - sleeping                   → LOW engagement (passive)
  - using_phone                → LOW engagement (passive)
  - turning_around             → LOW engagement (passive)

Falls back to pose-heuristic scoring if model is unavailable.
"""

import os
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Behavior → engagement mapping
# ---------------------------------------------------------------------------
# Class names are from the Roboflow student-behavior dataset v15
# (https://universe.roboflow.com/class-t58ex/student-behavior/dataset/15)
#
# Confirmed classes (visible in Roboflow annotation panel):
#   bow    — student bowing head over desk (writing / reading — moderate)
#   down   — student looking down / low engagement (passive)
#   lookup — student looking forward / up at the board (active)
#   sit    — student sitting normally, neutral posture (moderate)
#   sleep  — student sleeping on desk (passive)
#
# Additional aliases cover similar datasets from Roboflow Universe.
BEHAVIOR_ENGAGEMENT = {
    # ── Primary classes (student-behavior v15) ─────────────────────────────
    'lookup':             ('active',   88),   # looking at board/teacher
    'bow':                ('moderate', 65),   # head down — writing/reading
    'sit':                ('moderate', 60),   # neutral sitting
    'down':               ('passive',  30),   # disengaged, looking away
    'sleep':              ('passive',  10),   # sleeping on desk

    # ── Common aliases from other Roboflow student-behavior datasets ────────
    'looking_forward':    ('active',   90),
    'look_forward':       ('active',   90),
    'listening':          ('active',   88),
    'listening_to_lesson':('active',   88),
    'raising_hand':       ('active',   95),
    'hand_raising':       ('active',   95),
    'hand-raising':       ('active',   95),
    'reading':            ('moderate', 65),
    'writing':            ('moderate', 68),
    'thinking':           ('moderate', 60),
    'focusing':           ('moderate', 70),
    'boring':             ('moderate', 45),
    'sleeping':           ('passive',  10),
    'sleepy':             ('passive',  15),
    'using_phone':        ('passive',  20),
    'using-phone':        ('passive',  20),
    'looking_at_phone':   ('passive',  20),
    'phone_use':          ('passive',  20),
    'turning_around':     ('passive',  30),
    'turned_around':      ('passive',  30),
    "doesn't_listening":  ('passive',  30),
    'eating':             ('moderate', 40),
    'laughing':           ('moderate', 50),
}

# Default when class is unknown
DEFAULT_BEHAVIOR = ('moderate', 55)


def _normalize(name: str) -> str:
    """Normalize a class name to lowercase-underscore form."""
    return name.lower().replace(' ', '_').replace('-', '_')


class BehaviorDetector:
    """
    Detects students in a frame AND classifies their behavior in one pass.

    Usage:
        detector = BehaviorDetector()
        results = detector.detect(frame)
        # results is a list of dicts, one per detected student

    Each result dict:
        {
            'bbox':          (x1, y1, x2, y2),
            'behavior':      'sleeping',          # raw class name
            'activity':      'passive',           # active/moderate/passive
            'engagement':    10,                  # 0-100
            'confidence':    0.87,
        }
    """

    MODEL_FILENAME = 'student_behavior.pt'

    def __init__(self, model_path: str = None):
        self.model = None
        self.class_names = []
        self._load_model(model_path)

    def is_available(self) -> bool:
        return self.model is not None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, frame, conf: float = 0.25, imgsz: int = 1280) -> list:
        """
        Run inference on a single BGR frame.
        Returns list of student detection dicts.
        """
        if self.model is None:
            return []

        try:
            results = self.model(frame, conf=conf, imgsz=imgsz, verbose=False)
            detections = []
            for res in results:
                for box in res.boxes:
                    cls_id = int(box.cls[0])
                    raw_name = self.class_names[cls_id] if cls_id < len(self.class_names) else 'unknown'
                    norm_name = _normalize(raw_name)
                    activity, engagement = BEHAVIOR_ENGAGEMENT.get(norm_name, DEFAULT_BEHAVIOR)

                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                    confidence = float(box.conf[0])

                    detections.append({
                        'bbox':       (x1, y1, x2, y2),
                        'behavior':   norm_name,
                        'activity':   activity,
                        'engagement': engagement,
                        'confidence': round(confidence, 3),
                    })
            return detections
        except Exception as e:
            logger.error(f'BehaviorDetector inference error: {e}')
            return []

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load_model(self, model_path: str = None):
        """Try to load the YOLOv8 behavior model."""
        if model_path is None:
            # Look next to this file
            here = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(here, self.MODEL_FILENAME)

        if not os.path.exists(model_path):
            logger.warning(
                f'student_behavior.pt not found at {model_path}. '
                'Run download_behavior_model.py to fetch it from Roboflow, '
                'or export the model manually and place it there.'
            )
            return

        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            # Extract class names from model metadata
            if hasattr(self.model, 'names') and self.model.names:
                self.class_names = [self.model.names[i] for i in range(len(self.model.names))]
            logger.info(
                f'BehaviorDetector loaded: {model_path} '
                f'| classes: {self.class_names}'
            )
        except Exception as e:
            logger.error(f'Failed to load student_behavior.pt: {e}')
            self.model = None


# ---------------------------------------------------------------------------
# Convenience function for one-off frame analysis (used in video_analysis.py)
# ---------------------------------------------------------------------------

_singleton: BehaviorDetector = None


def get_behavior_detector() -> BehaviorDetector:
    """Return (and lazily initialise) the module-level singleton."""
    global _singleton
    if _singleton is None:
        _singleton = BehaviorDetector()
    return _singleton


def behavior_summary(detections: list) -> dict:
    """
    Aggregate a list of detections into a behavior breakdown dict.

    Returns:
        {
            'active':   int,
            'moderate': int,
            'passive':  int,
            'behaviors': {'sleeping': 2, 'raising_hand': 1, ...}
        }
    """
    summary = {'active': 0, 'moderate': 0, 'passive': 0, 'behaviors': {}}
    for d in detections:
        activity = d.get('activity', 'moderate')
        summary[activity] = summary.get(activity, 0) + 1
        bname = d.get('behavior', 'unknown')
        summary['behaviors'][bname] = summary['behaviors'].get(bname, 0) + 1
    return summary
