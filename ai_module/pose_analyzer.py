"""
Pose & Behavior Analyzer Module
Uses MediaPipe to estimate head orientation, posture, hand activity.
"""
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


class PoseAnalyzer:
    def __init__(self):
        self.pose = None
        self._load_mediapipe()

    def _load_mediapipe(self):
        try:
            import mediapipe as mp
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=True, # Critical for multi-student processing in a single loop
                model_complexity=0,
                min_detection_confidence=0.3, # Lower for distant students
            )
            logger.info('MediaPipe Pose initialized.')
        except Exception as e:
            logger.warning(f'MediaPipe not available: {e}. Using heuristic scoring.')
            self.pose = None

    def analyze(self, frame, bbox) -> dict:
        """
        Analyze pose within a bounding box crop.

        Returns dict with scores in [0, 1]:
        {
            'head_attention_score': float,
            'posture_score': float,
            'hand_activity_score': float,
            'writing_score': float,
            'motion_score': float,
        }
        """
        if self.pose is None:
            return self._heuristic_scores(frame, bbox)

        x1, y1, x2, y2 = bbox
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return self._default_scores()

        rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_crop)

        if not results.pose_landmarks:
            return self._heuristic_scores(frame, bbox)

        landmarks = results.pose_landmarks.landmark

        is_looking_down = self._is_looking_down(landmarks)

        return {
            'head_attention_score': self._head_attention(landmarks, is_looking_down),
            'posture_score': self._posture_score(landmarks),
            'hand_activity_score': self._hand_activity(landmarks),
            'writing_score': 0.9 if is_looking_down else self._writing_score(landmarks),
            'motion_score': 0.5,
        }

    def _is_looking_down(self, landmarks) -> bool:
        """Heuristic to detect if student is looking down at a desk."""
        try:
            import mediapipe as mp
            lm = mp.solutions.pose.PoseLandmark
            nose = landmarks[lm.NOSE]
            left_ear = landmarks[lm.LEFT_EAR]
            right_ear = landmarks[lm.RIGHT_EAR]
            
            # If nose is below ears or eyes, they are likely looking down
            avg_ear_y = (left_ear.y + right_ear.y) / 2
            # Also check if eyes are detectable (landmarks 1-5, but ear is 7-8)
            return nose.y > avg_ear_y + 0.01
        except Exception:
            return False

    def _head_attention(self, landmarks, is_looking_down=False) -> float:
        """Estimate if head is facing forward (attentive)."""
        if is_looking_down:
            return 0.4 # Low direct attention, but not 'away'
        try:
            import mediapipe as mp
            lm = mp.solutions.pose.PoseLandmark
            nose = landmarks[lm.NOSE]
            left_ear = landmarks[lm.LEFT_EAR]
            right_ear = landmarks[lm.RIGHT_EAR]

            # Symmetric ears → facing forward
            ear_symmetry = 1.0 - abs(left_ear.x - (1 - right_ear.x))
            # Nose visibility
            visibility = nose.visibility if hasattr(nose, 'visibility') else 0.8

            score = 0.6 * ear_symmetry + 0.4 * visibility
            return round(max(0.0, min(1.0, score)), 3)
        except Exception:
            return 0.6

    def _posture_score(self, landmarks) -> float:
        """Evaluate upright sitting posture."""
        try:
            import mediapipe as mp
            lm = mp.solutions.pose.PoseLandmark
            left_shoulder = landmarks[lm.LEFT_SHOULDER]
            right_shoulder = landmarks[lm.RIGHT_SHOULDER]
            nose = landmarks[lm.NOSE]

            # Shoulders should be level
            shoulder_level = 1.0 - abs(left_shoulder.y - right_shoulder.y) * 5
            # Head should be above shoulders
            head_above = 1.0 if nose.y < left_shoulder.y else 0.3

            score = 0.6 * shoulder_level + 0.4 * head_above
            return round(max(0.0, min(1.0, score)), 3)
        except Exception:
            return 0.6

    def _hand_activity(self, landmarks) -> float:
        """Detect if hands are raised or active."""
        try:
            import mediapipe as mp
            lm = mp.solutions.pose.PoseLandmark
            left_wrist = landmarks[lm.LEFT_WRIST]
            right_wrist = landmarks[lm.RIGHT_WRIST]
            left_shoulder = landmarks[lm.LEFT_SHOULDER]
            right_shoulder = landmarks[lm.RIGHT_SHOULDER]

            left_raised = left_wrist.y < left_shoulder.y
            right_raised = right_wrist.y < right_shoulder.y

            if left_raised or right_raised:
                return 1.0
            # Check if hands are near torso (relaxed) vs in front (writing)
            hand_forward = (abs(left_wrist.z) + abs(right_wrist.z)) / 2
            return round(min(1.0, hand_forward * 2), 3)
        except Exception:
            return 0.3

    def _writing_score(self, landmarks) -> float:
        """Detect writing-like hand movement (hands near desk level)."""
        try:
            import mediapipe as mp
            lm = mp.solutions.pose.PoseLandmark
            left_wrist = landmarks[lm.LEFT_WRIST]
            right_wrist = landmarks[lm.RIGHT_WRIST]
            left_hip = landmarks[lm.LEFT_HIP]

            # Hands near hip level (desk) suggests writing
            left_near_desk = abs(left_wrist.y - left_hip.y) < 0.2
            right_near_desk = abs(right_wrist.y - left_hip.y) < 0.2

            if left_near_desk and right_near_desk:
                return 0.8
            elif left_near_desk or right_near_desk:
                return 0.5
            return 0.2
        except Exception:
            return 0.3

    def _heuristic_scores(self, frame, bbox) -> dict:
        """Fallback heuristic when MediaPipe is unavailable."""
        x1, y1, x2, y2 = bbox
        h = y2 - y1
        w = x2 - x1
        # Simple heuristic: taller bounding box → more upright → more attentive
        # Squat/Short box → likely looking down at desk → high writing score
        aspect = h / max(w, 1)
        is_squat = aspect < 1.1
        
        return {
            'head_attention_score': 0.4 if is_squat else round(min(1.0, aspect / 1.5) * 0.7, 3),
            'posture_score': round(min(1.0, aspect / 1.2) * 0.6, 3),
            'hand_activity_score': 0.3,
            'writing_score': 0.85 if is_squat else 0.2,
            'motion_score': 0.3,
        }

    def _default_scores(self) -> dict:
        return {
            'head_attention_score': 0.5,
            'posture_score': 0.5,
            'hand_activity_score': 0.3,
            'writing_score': 0.2,
            'motion_score': 0.3,
        }
