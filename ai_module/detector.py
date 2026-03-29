"""
Student Detector Module
Uses YOLOv8 to detect persons in video frames.
"""
import numpy as np
import logging

logger = logging.getLogger(__name__)


class StudentDetector:
    def __init__(self, model_path='yolov8n.pt', confidence=0.15, device='cpu'):
        """
        Args:
            model_path: YOLOv8 model weights path (auto-downloads if not found)
            confidence: Detection confidence threshold
            device: 'cpu' or 'cuda'
        """
        self.confidence = confidence
        self.device = device
        self.model = None
        self._load_model(model_path)

    def _load_model(self, model_path):
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            logger.info(f'YOLOv8 model loaded: {model_path}')
        except Exception as e:
            logger.error(f'Failed to load YOLO model: {e}')
            raise

    def detect(self, frame, imgsz=640):
        """
        Detect persons in a frame.

        Returns:
            List of dicts: [{'bbox': [x1,y1,x2,y2], 'confidence': float}]
        """
        if self.model is None:
            return []

        results = self.model(
            frame,
            classes=[0],  # class 0 = person
            conf=self.confidence,
            device=self.device,
            imgsz=imgsz,
            verbose=False,
        )

        detections = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                detections.append({
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'confidence': round(conf, 3),
                })

        return detections

    def draw_detections(self, frame, detections):
        """Draw detection boxes on frame for visualization."""
        import cv2
        for det in detections:
            x1, y1, x2, y2 = det['bbox']
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        return frame
