"""
Video analysis endpoint: upload a classroom video file
and analyze it frame by frame using YOLO behavior detection.

Engagement is determined by detected student behavior:
  - looking_forward / raising_hand  → high engagement
  - reading / writing / thinking    → moderate engagement
  - sleeping / using_phone          → low engagement

Falls back to person/face detection + MediaPipe pose scoring when the behavior
model is unavailable (detection confidence is never used as engagement).
"""

import cv2
import numpy as np
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
import os
import sys
import tempfile
import logging
import threading

logger = logging.getLogger(__name__)
fh = logging.FileHandler('video_analysis.log')
fh.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)
logger.setLevel(logging.INFO)

_loader_lock = threading.Lock()
_detector_pkg_cache = None
_pose_pkg_cache = None
_pose_init_done = False
_ai_module_dir_cache = None


def reset_analysis_caches():
    """Clear cached models (e.g. after `manage.py fetch_behavior_model`)."""
    global _detector_pkg_cache, _pose_pkg_cache, _pose_init_done
    with _loader_lock:
        _detector_pkg_cache = None
        _pose_pkg_cache = None
        _pose_init_done = False


def _get_ai_module_dir():
    """
    Resolve ai_module on disk and prepend to sys.path once.
    Order: AI_MODULE_PATH env → ../../ai_module (Docker: /app/ai_module) → ../../../ai_module (local repo).
    """
    global _ai_module_dir_cache
    if _ai_module_dir_cache is not None:
        return _ai_module_dir_cache
    here = os.path.dirname(os.path.abspath(__file__))
    override = os.environ.get('AI_MODULE_PATH', '').strip()
    candidates = []
    if override:
        candidates.append(os.path.normpath(override))
    
    # settings.BASE_DIR / ai_module is usually best
    try:
        from django.conf import settings
        candidates.append(os.path.join(settings.BASE_DIR, 'ai_module'))
    except Exception:
        pass
        
    candidates.append(os.path.normpath(os.path.join(here, '..', '..', 'ai_module')))
    candidates.append(os.path.normpath(os.path.join(here, '..', '..', '..', 'ai_module')))
    
    chosen = None
    for c in candidates:
        if c and os.path.isdir(c):
            # Check if any .pt files exist there
            if any(f.endswith('.pt') for f in os.listdir(c)):
                chosen = c
                break
    
    if chosen is None:
        # Fallback to first existing dir
        for c in candidates:
            if c and os.path.isdir(c):
                chosen = c
                break
                
    if chosen is None:
        chosen = candidates[-1] # use last candidate as fallback
        logger.warning('ai_module directory missing; tried %s', candidates)
    else:
        logger.info('ai_module located at: %s', chosen)

    if chosen not in sys.path:
        sys.path.insert(0, chosen)
    _ai_module_dir_cache = chosen
    return chosen


# ── Detector loader ─────────────────────────────────────────────────────────

def _load_detector():
    """
    Priority order:
      1. Standard YOLOv8n person detector (yolov8n.pt)
      2. MediaPipe face detection
      3. Haar cascade (fallback)
    """
    global _detector_pkg_cache
    if _detector_pkg_cache is not None:
        return _detector_pkg_cache
    with _loader_lock:
        if _detector_pkg_cache is not None:
            return _detector_pkg_cache
        _get_ai_module_dir()
        pkg = _build_detector_pkg()
        _detector_pkg_cache = pkg
        return pkg


def _build_detector_pkg():
    # 1. Generic YOLOv8 person detector
    try:
        from ultralytics import YOLO
        ai_module_path = _get_ai_module_dir()
        model_path = os.path.join(ai_module_path, 'yolov8n.pt')

        if os.path.exists(model_path):
            logger.info('Using YOLOv8 model at %s', model_path)
            model = YOLO(model_path)
            # Ensure model is on CPU
            model.to('cpu')
            return {'type': 'yolo', 'model': model}
        
        logger.info('Attempting to load generic yolov8n.pt')
        model = YOLO('yolov8n.pt')
        model.to('cpu')
        return {'type': 'yolo', 'model': model}
    except Exception as e:
        logger.warning('YOLO load failed: %s. Models should be in ai_module/ directory.', e)

    # 2. MediaPipe (better than Cascade)
    try:
        import mediapipe as mp
        logger.info('Falling back to MediaPipe face detection')
        return {
            'type': 'mediapipe',
            'model': mp.solutions.face_detection.FaceDetection(
                model_selection=1, min_detection_confidence=0.20
            ),
        }
    except Exception as e:
        logger.warning('MediaPipe load failed: %s', e)

    # 3. Haar cascade fallback (tuned to reduce false positives)
    logger.info('Falling back to Haar Cascade (last resort)')
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    return {'type': 'cascade', 'model': face_cascade}


# ── Pose-based engagement (when behavior YOLO is not used) ─────────────────

def _load_pose_engagement():
    """Construct PoseAnalyzer + EngagementScorer (call after _get_ai_module_dir)."""
    try:
        from pose_analyzer import PoseAnalyzer
        from engagement_scorer import EngagementScorer
        return {'analyzer': PoseAnalyzer(), 'scorer': EngagementScorer()}
    except Exception as e:
        logger.info('Pose-based engagement unavailable, using presence-only proxy: %s', e)
        return None


def get_pose_engagement_pkg():
    """Process-wide singleton pose stack (failed load is cached too)."""
    global _pose_pkg_cache, _pose_init_done
    if _pose_init_done:
        return _pose_pkg_cache
    with _loader_lock:
        if _pose_init_done:
            return _pose_pkg_cache
        _get_ai_module_dir()
        _pose_pkg_cache = _load_pose_engagement()
        _pose_init_done = True
        return _pose_pkg_cache


def _engagement_from_pose(frame, bbox_xyxy, pose_pkg):
    """
    bbox_xyxy: (x1, y1, x2, y2) in pixel coords.
    Returns (engagement 0-100, activity) or None if scoring fails.
    """
    if not pose_pkg:
        return None
    try:
        scores = pose_pkg['analyzer'].analyze(frame, bbox_xyxy)
        total, label = pose_pkg['scorer'].compute(scores)
        eng = int(round(max(0.0, min(100.0, float(total)))))
        
        # Infer behavior
        behavior = None
        if scores.get('writing_score', 0) > 0.75:
            behavior = 'reading_writing'
        elif scores.get('hand_activity_score', 0) > 0.8:
            behavior = 'raising_hand'
        elif label == 'active':
            behavior = 'attentive'
        elif label == 'passive':
            behavior = 'distracted'
            
        return eng, label, behavior
    except Exception:
        return None


def _upper_body_bbox_from_face(fx, fy, fw, fh, w_frame, h_frame):
    """Expand a face box downward so MediaPipe Pose can see shoulders/torso."""
    pad_x = max(int(fw * 0.6), 8)
    top = max(0, fy - int(fh * 0.45))
    bottom = min(h_frame, fy + fh + int(fh * 3.8))
    left = max(0, fx - pad_x)
    right = min(w_frame, fx + fw + pad_x)
    if right - left < 24 or bottom - top < 40:
        return None
    return (left, top, right, bottom)


# ── Per-frame analysis ───────────────────────────────────────────────────────

def analyze_frame_engagement(frame, detector_pkg, recognizer=None, pose_pkg=None):
    """
    Analyze a single frame and return a list of student dicts:
        {
            'bbox':       {'x', 'y', 'w', 'h'},
            'engagement': int (0-100),
            'activity':   'active' | 'moderate' | 'passive',
            'behavior':   str | None,   # e.g. 'sleeping', 'raising_hand'
            'role':       'student',
            'name':       str | None,
        }
    """
    h_frame, w_frame = frame.shape[:2]
    results = []

    # ── Behavior model path ────────────────────────────────────────────────
    if detector_pkg['type'] == 'behavior':
        detections = detector_pkg['model'].detect(frame, imgsz=1280, conf=0.22)
        for d in detections:
            x1, y1, x2, y2 = d['bbox']
            # 1-variant: engagementni doim pose heuristicsdan hisoblaymiz.
            pe = _engagement_from_pose(frame, (x1, y1, x2, y2), pose_pkg) if pose_pkg else None
            behavior = d.get('behavior') # Base behavior if pose heuristic fails
            if pe:
                engagement, activity, pose_behavior = pe
                behavior = pose_behavior or behavior
            else:
                # Fallback bo'lsa ham, behavior score emas, minimal mantiqiy qiymat.
                engagement, activity = int(d.get('engagement', 58)), d.get('activity', 'moderate')
            results.append({
                'bbox':       {'x': x1, 'y': y1, 'w': x2 - x1, 'h': y2 - y1},
                'engagement': engagement,
                'activity':   activity,
                'behavior':   behavior,
                'role':       'student',
                'name':       None,
            })

    # ── Standard YOLO (person detection only) ──────────────────────────────
    elif detector_pkg['type'] == 'yolo':
        yolo_results = detector_pkg['model'](
            frame, classes=[0], conf=0.10, imgsz=1280, verbose=False
        )
        for res in yolo_results:
            for box in res.boxes:
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                pe = _engagement_from_pose(frame, (x1, y1, x2, y2), pose_pkg)
                if pe:
                    engagement, activity, behavior = pe
                else:
                    # Person detected only — do not equate detector confidence with engagement
                    engagement, activity, behavior = 58, 'moderate', None
                results.append({
                    'bbox':       {'x': x1, 'y': y1, 'w': x2 - x1, 'h': y2 - y1},
                    'engagement': engagement,
                    'activity':   activity,
                    'behavior':   behavior,
                    'role':       'student',
                    'name':       None,
                })

    # ── MediaPipe ──────────────────────────────────────────────────────────
    elif detector_pkg['type'] == 'mediapipe':
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res_mp = detector_pkg['model'].process(rgb)
        if res_mp.detections:
            for det in res_mp.detections:
                b = det.location_data.relative_bounding_box
                fx  = int(b.xmin  * w_frame)
                fy  = int(b.ymin  * h_frame)
                fw  = int(b.width * w_frame)
                fh  = int(b.height * h_frame)
                body = _upper_body_bbox_from_face(fx, fy, fw, fh, w_frame, h_frame)
                pe = _engagement_from_pose(frame, body, pose_pkg) if body else None
                if pe:
                    engagement, activity, behavior = pe
                else:
                    engagement, activity, behavior = 55, 'moderate', None
                results.append({
                    'bbox':       {'x': fx, 'y': fy, 'w': fw, 'h': fh},
                    'engagement': engagement,
                    'activity':   activity,
                    'behavior':   behavior,
                    'role':       'student',
                    'name':       None,
                })

    # ── Haar cascade ───────────────────────────────────────────────────────
    else:
        gray = cv2.equalizeHist(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
        # Tuned parameters: lower minNeighbors for higher recall in classroom videos
        faces = detector_pkg['model'].detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
        )
        for (fx, fy, fw, fh) in faces:
            body = _upper_body_bbox_from_face(int(fx), int(fy), int(fw), int(fh), w_frame, h_frame)
            pe = _engagement_from_pose(frame, body, pose_pkg) if body else None
            if pe:
                engagement, activity, behavior = pe
            else:
                engagement, activity, behavior = 52, 'moderate', None
            results.append({
                'bbox':       {'x': int(fx), 'y': int(fy), 'w': int(fw), 'h': int(fh)},
                'engagement': engagement,
                'activity':   activity,
                'behavior':   behavior,
                'role':       'student',
                'name':       None,
            })

    # ── Face recognition (works for all detector types) ───────────────────
    if recognizer and recognizer.is_trained:
        for res in results:
            try:
                b    = res['bbox']
                crop = frame[
                    max(0, b['y']):min(h_frame, b['y'] + b['h']),
                    max(0, b['x']):min(w_frame, b['x'] + b['w']),
                ]
                if crop.size < 100:
                    continue
                
                # STORE CROP FOR LATER SAVING
                res['face_crop'] = crop

                gray  = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                label, confidence = recognizer.recognizer.predict(
                    cv2.resize(gray, (100, 100))
                )
                
                # Simple mapping: FisherFace/LBPH distance to confidence %
                res['confidence'] = round(max(0, 100 - confidence), 1)

                if confidence < 80:
                    if label >= 1_000_000:
                        from apps.users.models import CustomUser
                        u = CustomUser.objects.filter(id=label - 1_000_000).first()
                        if u:
                            res['name'], res['role'] = f'{u.first_name} {u.last_name}', 'teacher'
                    else:
                        from apps.users.models import Student
                        s = Student.objects.filter(id=label).first()
                        if s:
                            res['name'] = f'{s.first_name} {s.last_name}'
                            res['student_obj'] = s
            except Exception:
                pass
    else:
        # Fallback: store crops even if recognizer is off
        for res in results:
            b = res['bbox']
            crop = frame[
                max(0, b['y']):min(h_frame, b['y'] + b['h']),
                max(0, b['x']):min(w_frame, b['x'] + b['w']),
            ]
            if crop.size > 0:
                res['face_crop'] = crop

    return results


# ── Django view ──────────────────────────────────────────────────────────────

class VideoAnalysisView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, lesson_id=None):
        """
        Accepts a video file upload, analyzes it frame by frame,
        and returns engagement + behavior statistics.
        lesson_id is optional — if not provided, results are not saved to DB.
        """
        video_file = request.FILES.get('video')
        if not video_file:
            return Response(
                {'error': 'No video file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lesson = None
        from django.apps import apps
        Lesson = apps.get_model('lessons', 'Lesson')
        Classroom = apps.get_model('classrooms', 'Classroom')
        LessonReport = apps.get_model('reports', 'LessonReport')

        if lesson_id:
            try:
                lesson = Lesson.objects.get(pk=lesson_id)
            except Exception:
                pass
        else:
            # Standalone analysis: create a dummy lesson to persist data
            try:
                classroom = Classroom.objects.first() # Use first available classroom
                if not classroom:
                    logger.error("No classroom found for standalone analysis")
                else:
                    lesson = Lesson.objects.create(
                        title=f"Video Upload Analysis - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                        classroom=classroom,
                        status=Lesson.Status.ENDED,
                        teacher=request.user,
                        start_time=timezone.now(),
                        end_time=timezone.now(),
                    )
            except Exception as e:
                logger.error(f"Error creating standalone lesson: {e}")

        suffix = os.path.splitext(video_file.name)[1] or '.mp4'
        tmp    = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        logger.info(f"Writing {video_file.name} to {tmp.name}...")
        for chunk in video_file.chunks():
            tmp.write(chunk)
        tmp.close()
        logger.info(f"Writing complete. Size on disk: {os.path.getsize(tmp.name)} bytes")

        try:
            logger.info(f"Starting analysis for user {request.user.email}")
            result = self._analyze_video(tmp.name, lesson)
            logger.info(f"Analysis finished. Found {result.get('max_students_in_frame', 0)} max students, {result.get('frames_analyzed', 0)} frames.")
            
            # Create LessonReport after successful analysis
            if lesson and result.get('success'):
                result['lesson_id'] = lesson.id

        except Exception as e:
            import traceback
            logger.error(f"FATAL ERROR during video analysis: {e}")
            logger.error(traceback.format_exc())
            result = {'error': f'Server xatosi: {str(e)}'}
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass

        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)

    # ── Core analysis ────────────────────────────────────────────────────

    def _analyze_video(self, video_path, lesson=None):
        logger.info(f"Starting analysis of {video_path}")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"VideoCapture failed to open {video_path}")
            return {'error': "Videoni ochib bo'lmadi — format qo'llab-quvvatlanmasligi mumkin."}

        detector_pkg = _load_detector()
        if not detector_pkg:
            return {'error': 'AI moduli yuklanmadi. Tizim sozlamalarini tekshiring.'}

        # 1-variant: engagement doim pose heuristicsdan hisoblanadi (behavior model bo'lsa ham).
        pose_pkg = get_pose_engagement_pkg()

        recognizer = None
        try:
            from apps.streaming.recognition import get_recognizer
            recognizer = get_recognizer()
        except Exception:
            pass

        fps           = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec  = total_frames / fps if fps > 0 else 0

        # Sample up to 500 frames across full duration
        max_analyze_frames = 500
        sample_every       = max(1, int(total_frames / max_analyze_frames))
        behavior_mode      = False  # behavior model ishlatilsa ham, engagement hisoblanmaydi

        logger.info(
            f'Analyzing video: {total_frames} frames, '
            f'sampling every {sample_every}, '
            f'detector: {detector_pkg["type"]}'
        )

        timeline         = []
        all_engagement   = []
        recognized_names = set()
        frame_idx        = 0
        max_students     = 0
        behavior_counts  = {}   # optional breakdown (bu 1-variantda odatda bo'sh)
        avg_eng_ema      = None
        avg_eng_alpha    = 0.35

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_every == 0:
                ts      = frame_idx / fps
                faces   = analyze_frame_engagement(frame, detector_pkg, recognizer, pose_pkg)
                students = [f for f in faces if f.get('role') != 'teacher']
                # Sort students by X coordinate to maintain consistent IDs (left to right)
                students = sorted(students, key=lambda s: s['bbox']['x'])
                
                if frame_idx == 0:
                    logger.info(f"First frame analysis: found {len(students)} students using {detector_pkg['type']}")

                for f in faces:
                    if f.get('name'):
                        recognized_names.add(f['name'])

                # Tally behavior counts
                for s in students:
                    bname = s.get('behavior')
                    if not bname:
                        continue
                    behavior_counts[bname] = behavior_counts.get(bname, 0) + 1

                if frame_idx % sample_every == 0:
                    logger.info(f"Processing frame {frame_idx}/{total_frames} ({len(students)} students found)")

                max_students = max(max_students, len(students))

                if students:
                    raw_avg_eng = sum(s['engagement'] for s in students) / len(students)
                    if avg_eng_ema is None:
                        avg_eng_ema = raw_avg_eng
                    else:
                        avg_eng_ema = avg_eng_alpha * raw_avg_eng + (1.0 - avg_eng_alpha) * avg_eng_ema
                    all_engagement.append(avg_eng_ema)

                    active   = sum(1 for s in students if s['activity'] == 'active')
                    moderate = sum(1 for s in students if s['activity'] == 'moderate')
                    passive  = sum(1 for s in students if s['activity'] == 'passive')

                    timeline.append({
                        'time':       round(ts, 1),
                        'engagement': round(avg_eng_ema, 1),
                        'count':      len(students),
                        'active':     active,
                        'moderate':   moderate,
                        'passive':    passive,
                        'behavior':   students[0].get('behavior') if len(students) == 1 else None,
                        'students_data': students # Pass full student data for saving
                    })

            frame_idx += 1

        cap.release()
        logger.info(f"Video analysis finished. Total frames: {frame_idx}, Analyzed: {len(timeline)}, Max students: {max_students}")

        if not all_engagement:
            return {
                'error': (
                    'No students detected in video. '
                    'Check video quality or lighting. '
                    f'Detector used: {detector_pkg["type"]}'
                )
            }

        avg_engagement = round(sum(all_engagement) / len(all_engagement), 1)
        n              = len(all_engagement)

        # Background saving of logs (since there can be thousands)
        if lesson:
            import threading
            def save_logs_background(lesson, timeline):
                logger.info(f"Background saving started for lesson {lesson.id}")
                from apps.analytics.models import ActivityLog
                from django.core.files.base import ContentFile
                import uuid
                
                saved_total = 0
                logs_to_create = []
                sc_save_counter = 0

                for point in timeline:
                    for i, s_data in enumerate(point.get('students_data', [])):
                        try:
                            label = (
                                'active'   if s_data['engagement'] >= 75 else
                                'moderate' if s_data['engagement'] >= 50 else
                                'passive'
                            )
                            temp_id = f"video_student_{i+1}"
                            
                            log_entry = ActivityLog(
                                lesson=lesson,
                                temp_student_id=temp_id,
                                student=s_data.get('student_obj'),
                                timestamp=timezone.now(),
                                total_engagement_score=s_data['engagement'],
                                behavior_label=s_data.get('behavior'),
                                activity_label=label,
                                confidence_score=s_data.get('confidence')
                            )
                            if 'face_crop' in s_data and s_data['face_crop'] is not None and s_data['face_crop'].size > 0:
                                if sc_save_counter % 20 == 0:
                                    ret, buf = cv2.imencode('.jpg', s_data['face_crop'])
                                    if ret:
                                        filename = f"crop_{lesson.id}_{uuid.uuid4().hex[:8]}.jpg"
                                        log_entry.face_screenshot.save(filename, ContentFile(buf.tobytes()), save=False)
                                sc_save_counter += 1
                            
                            logs_to_create.append(log_entry)
                        except Exception as e:
                            logger.error(f"Error preparing log entry: {e}")

                if logs_to_create:
                    try:
                        ActivityLog.objects.bulk_create(logs_to_create, batch_size=500)
                        saved_total = len(logs_to_create)
                    except Exception as e:
                        logger.error(f"Bulk creation failed: {e}. Falling back to iterative save.")
                        for log in logs_to_create:
                            try:
                                log.save()
                                saved_total += 1
                            except Exception:
                                pass
                
                del logs_to_create
                import gc
                gc.collect()

                logger.info(f"Background saving finished for lesson {lesson.id}. Total logs: {saved_total}")
                
                # Automatically trigger report generation now that all logs are saved
                try:
                    from apps.reports.tasks import generate_lesson_report
                    generate_lesson_report.delay(lesson.id)
                    logger.info(f"Report generation task triggered for lesson {lesson.id}")
                except Exception as e:
                    logger.error(f"Error triggering report generation: {e}")

            # Fire and forget
            threading.Thread(target=save_logs_background, args=(lesson, timeline), daemon=True).start()

        return {
            'success':               True,
            'detector_used':         detector_pkg['type'],
            'behavior_model_active': behavior_mode,
            'duration_seconds':      round(duration_sec, 1),
            'frames_analyzed':       len(timeline),
            'max_students_in_frame': max_students,
            'avg_engagement':        avg_engagement,
            'active_pct':            round(sum(1 for e in all_engagement if e >= 75) / n * 100, 1),
            'moderate_pct':          round(sum(1 for e in all_engagement if 50 <= e < 75) / n * 100, 1),
            'passive_pct':           round(sum(1 for e in all_engagement if e < 50) / n * 100, 1),
            'behavior_breakdown':    behavior_counts,   # ← NEW
            'timeline':              timeline,
            'recognized_students':   list(recognized_names),
            'db_logs_pending':       len(timeline) * 30, # estimate
        }
