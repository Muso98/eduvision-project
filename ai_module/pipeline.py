"""
EduVision AI Pipeline — Main Orchestrator

Usage:
    python pipeline.py --lesson-id 1 --source 0
    python pipeline.py --lesson-id 1 --source rtsp://192.168.1.100/stream
    python pipeline.py --lesson-id 1 --source demo
    python pipeline.py --lesson-id 1 --source 0 --show  # display window
"""
import asyncio
import time
import argparse
import logging
import cv2
import numpy as np

from stream_reader import StreamReader
from detector import StudentDetector
from tracker import StudentTracker
from pose_analyzer import PoseAnalyzer
from engagement_scorer import EngagementScorer
from ws_client import WSClient
from face_recognizer import FaceRecognizer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('pipeline')

BACKEND_WS_URL = 'ws://localhost:8000'
FPS_TARGET = 10


class Pipeline:
    def __init__(self, lesson_id: int, source, show=False):
        self.lesson_id = lesson_id
        self.show = show
        self.stream = StreamReader(source, fps_target=FPS_TARGET)
        self.detector = StudentDetector(model_path='yolov8n.pt')
        self.tracker = StudentTracker()
        self.pose_analyzer = PoseAnalyzer()
        self.scorer = EngagementScorer()
        # 1-variant: engagement doim pose/heuristic asosida hisoblanadi.
        self.ws_client = WSClient(BACKEND_WS_URL, lesson_id)
        http_url = BACKEND_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://').split('/ws')[0]
        self.recognizer = FaceRecognizer(backend_url=http_url)
        self._prev_bboxes = {}  # for motion estimation
        self._eng_ema = {}  # temp_student_id -> EMA engagement
        self._motion_ema = {}  # temp_student_id -> EMA motion score
        self._ema_alpha = 0.35

    async def run(self):
        self.recognizer.load_students(self.lesson_id)
        await self.ws_client.connect()
        self.stream.connect()

        frame_interval = 1.0 / FPS_TARGET
        logger.info(f'Pipeline started → Lesson {self.lesson_id}, FPS target: {FPS_TARGET}')
        
        # Check if source is a file (not webcam/RTSP) to enable faster processing
        is_file = False
        if isinstance(self.stream.source, str) and not self.stream.source.startswith('rtsp') and self.stream.source != 'demo':
            is_file = True
            logger.info("File source detected: Enabling frame skipping for speed.")

        frame_count = 0
        try:
            while True:
                t_start = time.time()

                ret, frame = self.stream.read_frame()
                if not ret:
                    logger.info(f'End of stream or error. Total frames processed: {frame_count}')
                    break
                
                frame_count += 1
                
                # For files, skip 10 frames to speed up analysis
                if is_file and frame_count % 10 != 1:
                    continue

                students_data = self.process_frame(frame)
                await self.ws_client.send_frame_data(
                    students=students_data,
                    total_detected=len(students_data),
                )

                if self.show and frame is not None:
                    self._draw_overlay(frame, students_data)
                    cv2.imshow('EduVision AI Monitor', frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break

                elapsed = time.time() - t_start
                sleep_time = max(0, frame_interval - elapsed)
                await asyncio.sleep(sleep_time)

        except KeyboardInterrupt:
            logger.info('Pipeline stopped by user.')
        finally:
            self.stream.release()
            await self.ws_client.close()
            cv2.destroyAllWindows()

    def process_frame(self, frame) -> list:
        """Run full detection → tracking → pose/behavior → scoring pipeline on one frame."""
        results = []
        # 1. Detect persons with higher resolution for distant students
        detections = self.detector.detect(frame, imgsz=1280)

        # 2. Track across frames
        tracked = self.tracker.update(detections)

        # 3. Analyze each tracked student with pose-based scoring
        for student in tracked:
            sid = student['temp_student_id']
            bbox = student['bbox']

            # Face recognition (optional)
            if not str(sid).startswith('db_') and self.recognizer.trained:
                x1, y1, x2, y2 = bbox
                h_frame, w_frame = frame.shape[:2]
                crop = frame[max(0, y1):min(h_frame, y2), max(0, x1):min(w_frame, x2)]
                if crop.size > 0:
                    recognized_id = self.recognizer.recognize(crop)
                    if recognized_id:
                        for k, v in self.tracker.tracks.copy().items():
                            if v.student_id == sid:
                                v.student_id = recognized_id
                        sid = recognized_id
                        student['temp_student_id'] = recognized_id

            # 4. Pose analysis
            pose_scores = self.pose_analyzer.analyze(frame, bbox)

            # 5. Motion score (with EMA smoothing)
            motion_raw = self._compute_motion(sid, bbox)
            motion_smoothed = self._ema(self._motion_ema, sid, motion_raw)
            pose_scores['motion_score'] = motion_smoothed

            # 6. Engagement score (with EMA smoothing)
            total_raw, _ = self.scorer.compute(pose_scores)
            total_smoothed = self._ema(self._eng_ema, sid, total_raw)

            # Use the same writing override logic, but based on smoothed score
            is_writing = pose_scores.get('writing_score', 0) > 0.8
            label_smoothed = self.scorer.classify(total_smoothed, is_writing=is_writing)

            results.append({
                'temp_student_id': sid,
                'bbox': bbox,
                'behavior_label': None,
                **pose_scores,
                'total_engagement_score': round(float(total_smoothed), 2),
                'activity_label': label_smoothed,
                'motion_score': motion_smoothed,
            })

        # Update prev bboxes for motion
        self._prev_bboxes = {s['temp_student_id']: s['bbox'] for s in tracked}

        return results

    def _ema(self, store: dict, key: str, value: float) -> float:
        """Exponential moving average to reduce jitter in real-time scoring."""
        prev = store.get(key)
        if prev is None:
            store[key] = float(value)
            return float(value)
        out = self._ema_alpha * float(value) + (1.0 - self._ema_alpha) * float(prev)
        store[key] = out
        return out

    def _compute_motion(self, student_id: str, current_bbox: list) -> float:
        """Estimate motion score from bbox center displacement."""
        if student_id not in self._prev_bboxes:
            return 0.3

        prev = self._prev_bboxes[student_id]
        cx_prev = (prev[0] + prev[2]) / 2
        cy_prev = (prev[1] + prev[3]) / 2
        cx_curr = (current_bbox[0] + current_bbox[2]) / 2
        cy_curr = (current_bbox[1] + current_bbox[3]) / 2

        dist = ((cx_curr - cx_prev) ** 2 + (cy_curr - cy_prev) ** 2) ** 0.5
        # Normalize: 0-50px → 0-1
        return round(min(1.0, dist / 50.0), 3)

    def _draw_overlay(self, frame, students_data):
        """Draw tracking info on frame for debugging."""
        for student in students_data:
            x1, y1, x2, y2 = student['bbox']
            label = student['activity_label']
            score = student['total_engagement_score']
            sid = student['temp_student_id']

            color = {
                'active': (0, 255, 0),
                'moderate': (0, 165, 255),
                'passive': (0, 0, 255),
            }.get(label, (128, 128, 128))

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            behavior = student.get('behavior_label') or ''
            label_text = f'{sid} {score:.0f}%' + (f' [{behavior}]' if behavior else '')
            cv2.putText(
                frame, label_text,
                (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1
            )


def main():
    parser = argparse.ArgumentParser(description='EduVision AI Pipeline')
    parser.add_argument('--lesson-id', type=int, required=True, help='Active lesson ID')
    parser.add_argument('--source', default='0', help='Video source: 0 (webcam), RTSP URL, or "demo"')
    parser.add_argument('--show', action='store_true', help='Show debug video window')
    parser.add_argument('--backend', default='ws://localhost:8000', help='Backend WebSocket URL')
    args = parser.parse_args()

    global BACKEND_WS_URL
    BACKEND_WS_URL = args.backend

    pipeline = Pipeline(
        lesson_id=args.lesson_id,
        source=args.source,
        show=args.show,
    )
    asyncio.run(pipeline.run())


if __name__ == '__main__':
    main()
