import cv2
import numpy as np
import os
import sys
import logging
import threading
import uuid
import gc
from django.utils import timezone
from django.core.files.base import ContentFile
from django.conf import settings

logger = logging.getLogger(__name__)

# Cache for AI modules
_loader_lock = threading.Lock()
_detector_pkg_cache = None
_pose_pkg_cache = None
_pose_init_done = False
_ai_module_dir_cache = None

def _get_ai_module_dir():
    global _ai_module_dir_cache
    if _ai_module_dir_cache is not None:
        return _ai_module_dir_cache
    
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = []
    
    # settings.BASE_DIR / ai_module is usually best
    try:
        candidates.append(os.path.join(settings.BASE_DIR, 'ai_module'))
    except Exception:
        pass
        
    candidates.append(os.path.normpath(os.path.join(here, '..', '..', 'ai_module')))
    candidates.append(os.path.normpath(os.path.join(here, '..', '..', '..', 'ai_module')))
    
    chosen = None
    for c in candidates:
        if c and os.path.isdir(c):
            if any(f.endswith('.pt') for f in os.listdir(c)):
                chosen = c
                break
    
    if chosen and chosen not in sys.path:
        sys.path.insert(0, chosen)
    
    _ai_module_dir_cache = chosen
    return chosen

def _load_detector():
    global _detector_pkg_cache
    if _detector_pkg_cache is not None:
        return _detector_pkg_cache
    with _loader_lock:
        if _detector_pkg_cache is not None:
            return _detector_pkg_cache
        _get_ai_module_dir()
        
        # 1. Behavior or YOLO
        try:
            from ultralytics import YOLO
            ai_path = _get_ai_module_dir()
            model_path = os.path.join(ai_path, 'yolov8n.pt')
            if os.path.exists(model_path):
                model = YOLO(model_path)
                model.to('cpu')
                _detector_pkg_cache = {'type': 'yolo', 'model': model}
                return _detector_pkg_cache
        except Exception as e:
            logger.warning(f"YOLO load failed: {e}")

        # 2. Fallback to MediaPipe
        try:
            import mediapipe as mp
            _detector_pkg_cache = {
                'type': 'mediapipe',
                'model': mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.2)
            }
            return _detector_pkg_cache
        except Exception:
            pass

        # 3. Last resort Haar
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        _detector_pkg_cache = {'type': 'cascade', 'model': face_cascade}
        return _detector_pkg_cache

def get_pose_engagement_pkg():
    global _pose_pkg_cache, _pose_init_done
    if _pose_init_done:
        return _pose_pkg_cache
    with _loader_lock:
        if _pose_init_done:
            return _pose_pkg_cache
        _get_ai_module_dir()
        try:
            from pose_analyzer import PoseAnalyzer
            from engagement_scorer import EngagementScorer
            _pose_pkg_cache = {'analyzer': PoseAnalyzer(), 'scorer': EngagementScorer()}
        except Exception:
            _pose_pkg_cache = None
        _pose_init_done = True
        return _pose_pkg_cache

def _engagement_from_pose(frame, bbox_xyxy, pose_pkg):
    if not pose_pkg: return None
    try:
        scores = pose_pkg['analyzer'].analyze(frame, bbox_xyxy)
        total, label = pose_pkg['scorer'].compute(scores)
        eng = int(round(max(0.0, min(100.0, float(total)))))
        
        behavior = 'attentive'
        if scores.get('writing_score', 0) > 0.7: behavior = 'reading_writing'
        elif scores.get('hand_activity_score', 0) > 0.8: behavior = 'raising_hand'
        elif label == 'passive': behavior = 'distracted'
            
        return eng, label, behavior
    except Exception:
        return None

def _upper_body_bbox_from_face(fx, fy, fw, fh, w_frame, h_frame):
    pad_x = max(int(fw * 0.6), 8)
    top = max(0, fy - int(fh * 0.45))
    bottom = min(h_frame, fy + fh + int(fh * 3.8))
    left = max(0, fx - pad_x)
    right = min(w_frame, fx + fw + pad_x)
    return (left, top, right, bottom) if (right - left > 20) else None

def analyze_frame_engagement(frame, detector_pkg, recognizer=None, pose_pkg=None):
    if not detector_pkg: return []
    h_frame, w_frame = frame.shape[:2]
    faces = []
    
    if detector_pkg['type'] == 'yolo':
        y_res = detector_pkg['model'](frame, classes=[0], conf=0.15, verbose=False, imgsz=960)
        for r in y_res:
            for box in r.boxes:
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                pe = _engagement_from_pose(frame, (x1, y1, x2, y2), pose_pkg)
                engagement, label, behavior = pe if pe else (55, 'moderate', 'attentive')
                faces.append({
                    'bbox': {'x': x1, 'y': y1, 'w': x2 - x1, 'h': y2 - y1},
                    'engagement': engagement, 'activity': label, 'behavior': behavior, 'role': 'student'
                })
    
    elif detector_pkg['type'] == 'mediapipe':
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res_mp = detector_pkg['model'].process(rgb)
        if res_mp.detections:
            for det in res_mp.detections:
                b = det.location_data.relative_bounding_box
                fx, fy = int(b.xmin * w_frame), int(b.ymin * h_frame)
                fw, fh = int(b.width * w_frame), int(b.height * h_frame)
                body = _upper_body_bbox_from_face(fx, fy, fw, fh, w_frame, h_frame)
                pe = _engagement_from_pose(frame, body, pose_pkg) if body else None
                engagement, label, behavior = pe if pe else (55, 'moderate', 'attentive')
                faces.append({
                    'bbox': {'x': fx, 'y': fy, 'w': fw, 'h': fh},
                    'engagement': engagement, 'activity': label, 'behavior': behavior, 'role': 'student'
                })
                
    # Recognition wrapper
    if recognizer and recognizer.is_trained:
        for f in faces:
            try:
                b = f['bbox']
                crop = frame[max(0, b['y']):min(h_frame, b['y']+b['h']), max(0, b['x']):min(w_frame, b['x']+b['w'])]
                if crop.size > 500:
                    f['face_crop'] = crop
                    label, conf = recognizer.recognizer.predict(cv2.resize(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), (100, 100)))
                    if conf < 85:
                        if label >= 1_000_000:
                            from apps.users.models import CustomUser
                            u = CustomUser.objects.filter(id=label-1_000_000).first()
                            if u: f['name'], f['role'] = f'{u.fullname}', 'teacher'
                        else:
                            from apps.users.models import Student
                            s = Student.objects.filter(id=label).first()
                            if s: f['name'], f['student_obj'] = f'{s.full_name}', s
            except: pass
    return faces

def process_video_file_task(video_path, lesson_id):
    from apps.lessons.models import Lesson
    from apps.analytics.models import ActivityLog
    from apps.reports.tasks import generate_lesson_report
    
    # Ensure logging to file for easier debugging
    import logging
    fh = logging.FileHandler('video_analysis.log')
    fh.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    try:
        lesson = Lesson.objects.get(id=lesson_id)
        # Ensure we track processing state
        lesson.is_processing = True
        lesson.save(update_fields=['is_processing'])
    except Lesson.DoesNotExist: 
        logger.error(f"Lesson {lesson_id} not found for background analysis.")
        return

    logger.info(f"Video analysis started for lesson {lesson_id}: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): 
        logger.error(f"VideoCapture failed to open {video_path}. Marking lesson as failed.")
        lesson.is_processing = False
        lesson.status = Lesson.Status.ENDED
        lesson.save()
        return

    detector_pkg = _load_detector()
    pose_pkg = get_pose_engagement_pkg()
    recognizer = None
    try:
        from apps.streaming.recognition import get_recognizer
        recognizer = get_recognizer()
    except: pass
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames <= 0:
        logger.error(f"Video has 0 frames: {video_path}. Marking lesson as failed.")
        cap.release()
        lesson.is_processing = False
        lesson.status = Lesson.Status.ENDED
        lesson.save()
        return

    skip_frames = max(1, total_frames // 400) # Analyze ~400 points
    
    frame_idx = 0
    logs_to_create = []
    sc_counter = 0
    
    while cap.isOpened() and frame_idx < total_frames:
        if frame_idx % skip_frames == 0:
            ret, frame = cap.read()
            if not ret: break
            
            students = analyze_frame_engagement(frame, detector_pkg, recognizer, pose_pkg)
            for i, s in enumerate(students):
                log = ActivityLog(
                    lesson=lesson, temp_student_id=f"v_{i+1}", student=s.get('student_obj'),
                    timestamp=timezone.now(), total_engagement_score=s['engagement'],
                    behavior_label=s.get('behavior'), activity_label=s['activity']
                )
                if 'face_crop' in s and sc_counter % 20 == 0:
                    ret_enc, buf = cv2.imencode('.jpg', s['face_crop'])
                    if ret_enc:
                        log.face_screenshot.save(f"bg_{uuid.uuid4().hex[:8]}.jpg", ContentFile(buf.tobytes()), save=False)
                sc_counter += 1
                logs_to_create.append(log)
            
            logger.info(f"Progress: {frame_idx}/{total_frames}")
            gc.collect()
        else:
            ret = cap.grab()
            if not ret: break
            
        frame_idx += 1
    
    cap.release()
    if logs_to_create:
        ActivityLog.objects.bulk_create(logs_to_create, batch_size=400)
    
    lesson.is_processing = False
    lesson.status = Lesson.Status.ENDED
    lesson.save()
    generate_lesson_report(lesson_id)
    logger.info(f"Analysis complete for lesson {lesson_id}")
