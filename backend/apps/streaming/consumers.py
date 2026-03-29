"""
Django Channels WebSocket consumers for EduVision.

Consumers:
- StreamConsumer: AI module sends frame analysis data here
- DashboardConsumer: Frontend subscribes for live lesson stats
- AlertConsumer: Frontend receives engagement drop alerts
"""
import json
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from apps.analytics.models import ActivityLog, StudentSession
import logging

logger = logging.getLogger(__name__)


class StreamConsumer(AsyncWebsocketConsumer):
    """
    AI module connects here and sends frame analysis JSON.
    This consumer saves data to DB and relays to dashboard group.
    """
    async def connect(self):
        self.lesson_id = self.scope['url_route']['kwargs']['lesson_id']
        logger.info(f"[Sync] WS CONNECT: lesson {self.lesson_id}")
        self.group_name = f'stream_{self.lesson_id}'
        
        # Authenticate via TokenAuthMiddleware
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            logger.warning(f"[Sync] Rejected Anonymous connection for lesson {self.lesson_id}")
            # Use a specific application-level close code for Auth failure (4001)
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"StreamConsumer connected for lesson {self.lesson_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Expects JSON with student activity data from AI module:
        {
            "students": [
                {
                    "temp_student_id": "student_1",
                    "head_attention_score": 0.8,
                    "posture_score": 0.7,
                    "hand_activity_score": 0.3,
                    "writing_score": 0.5,
                    "motion_score": 0.2,
                    "total_engagement_score": 65.0,
                    "activity_label": "moderate"
                }
            ],
            "frame_timestamp": "2024-01-01T12:00:00Z",
            "total_detected": 25
        }
        """
        try:
            logger.info(f"[Sync] Packet received for {self.lesson_id} (len={len(text_data)})")
            data = json.loads(text_data)
        except json.JSONDecodeError as e:
            logger.error(f"[Sync] JSON Decode Error: {str(e)}")
            return

        lesson_id = int(self.lesson_id)
        frame_timestamp = data.get('frame_timestamp', timezone.now().isoformat())
        students = data.get('students', [])

        # Enrich student data with names using Real AI (if frame present) or fallback
        frame_base64 = data.get('frame_base64')
        
        # Throttle enrichment to once every 5 seconds per consumer to save CPU
        current_time = time.time()
        last_enrich = getattr(self, 'last_enrich_time', 0)
        
        if (current_time - last_enrich > 5.0) or not getattr(self, 'enriched_once', False):
            enriched_students = await self.enrich_student_names(students, frame_base64)
            self.last_enrich_time = current_time
            self.enriched_once = True
            # Cache names
            self.stored_names = {s.get('temp_student_id'): s.get('fullname') for s in enriched_students if s.get('fullname')}
        else:
            enriched_students = []
            stored = getattr(self, 'stored_names', {})
            for s in students:
                sid = s.get('temp_student_id')
                if sid in stored:
                    s['fullname'] = stored[sid]
                enriched_students.append(s)

        now_students = [s for s in enriched_students if s.get('role') != 'teacher']

        # Compute summary for dashboard broadcast
        active = sum(1 for s in now_students if s.get('activity_label') == 'active')
        passive = sum(1 for s in now_students if s.get('activity_label') == 'passive')
        moderate = sum(1 for s in now_students if s.get('activity_label') == 'moderate')
        avg_score = (
            sum(s.get('total_engagement_score', 0) for s in now_students) / len(now_students)
            if now_students else 0
        )

        # Save to DB and update sessions
        await self.save_activity_logs(lesson_id, now_students, frame_timestamp)

        dashboard_payload = {
            'type': 'dashboard.update',
            'data': {
                'lesson_id': lesson_id,
                'timestamp': frame_timestamp,
                'total_students': len(now_students),
                'active_count': active,
                'passive_count': passive,
                'moderate_count': moderate,
                'avg_engagement': round(avg_score, 2),
                'students': enriched_students,
                'timeline_history': await self.get_recent_timeline(lesson_id),
            }
        }

        # Relay to dashboard channel group
        logger.info(f"[Sync] Broadcasting to dashboard_{lesson_id}: {active} active, {len(now_students)} total")
        await self.channel_layer.group_send(
            f'dashboard_{self.lesson_id}',
            dashboard_payload
        )

        # Heartbeat check: reset disconnection timer
        self.last_activity = timezone.now()

        # Check for alert condition (avg engagement <= 35)
        if avg_score <= 35 and len(now_students) > 0:
            await self.channel_layer.group_send(
                f'alerts_{self.lesson_id}',
                {
                    'type': 'alert.low_engagement',
                    'data': {
                        'lesson_id': lesson_id,
                        'timestamp': frame_timestamp,
                        'avg_engagement': round(avg_score, 2),
                        'message': f'Sinfda faollik juda past: {round(avg_score, 1)}%',
                    }
                }
            )

    @database_sync_to_async
    def save_activity_logs(self, lesson_id, students, frame_timestamp):
        from apps.lessons.models import Lesson
        try:
            lesson = Lesson.objects.get(pk=lesson_id, status='active')
        except Lesson.DoesNotExist:
            logger.warning(f"[Sync] Lesson {lesson_id} not found or NOT active. Skipping save.")
            return

        logger.debug(f"[Sync] Saving logs for lesson {lesson_id}, students count: {len(students)}")

        logs = []
        for student in students:
            sid = student.get('temp_student_id')
            if not sid:
                continue

            actual_student = None
            if str(sid).startswith('db_') or str(sid).startswith('browser_face_'):
                try:
                    from apps.users.models import Student
                    try:
                        idx = int(str(sid).replace('browser_face_', ''))
                    except ValueError:
                        idx = 0
                    students_qs = Student.objects.all().order_by('id')
                    if students_qs.count() > idx:
                        actual_student = students_qs[idx]
                    else:
                        actual_student = students_qs.first()
                except Exception:
                    pass
            
            if not actual_student and str(sid).startswith('db_'):
                try:
                    student_pk = int(str(sid).split('_')[1])
                    from apps.users.models import Student
                    actual_student = Student.objects.get(pk=student_pk)
                except (ValueError, Exception):
                    pass

            # Upsert student session
            StudentSession.objects.update_or_create(
                lesson=lesson,
                temp_student_id=sid,
                defaults={'last_seen': timezone.now(), 'student': actual_student}
            )

            logs.append(ActivityLog(
                lesson=lesson,
                temp_student_id=sid,
                student=actual_student,
                timestamp=timezone.now(),
                head_attention_score=student.get('head_attention_score', 0),
                posture_score=student.get('posture_score', 0),
                hand_activity_score=student.get('hand_activity_score', 0),
                writing_score=student.get('writing_score', 0),
                motion_score=student.get('motion_score', 0),
                total_engagement_score=student.get('total_engagement_score', 0),
                # Frontend sends 'behavior', DB column is 'behavior_label'
                behavior_label=student.get('behavior_label') or student.get('behavior'),
                activity_label=student.get('activity_label', 'passive'),
            ))

        if logs:
            ActivityLog.objects.bulk_create(logs)
            logger.info(f"[Sync] Successfully saved {len(logs)} activity logs for lesson {lesson_id}")


    @database_sync_to_async
    def enrich_student_names(self, students, frame_base64=None):
        enriched_students = []
        
        # Decode frame
        frame_img = None
        if frame_base64:
            try:
                import base64
                import numpy as np
                import cv2
                encoded_data = frame_base64.split(',')[1] if ',' in frame_base64 else frame_base64
                nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
                frame_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                pass
                
        # Get ML Recognizer
        try:
            from apps.streaming.recognition import get_recognizer
            recognizer = get_recognizer()
            
            # recognizer.train_from_db() - moved to separate trigger to avoid blocking stream

        except ImportError:
            recognizer = None

        for s in students:
            sid = s.get('temp_student_id')
            student_name = f"Student #{sid}"
            actual_student = None

            # 1) Try True AI Face Recognition
            if recognizer and frame_img is not None and s.get('bbox'):
                predicted_id = recognizer.recognize_face(frame_img, s.get('bbox'))
                if predicted_id:
                    if predicted_id >= 1000000:
                        from apps.users.models import CustomUser
                        teacher_id = predicted_id - 1000000
                        actual_teacher = CustomUser.objects.filter(id=teacher_id).first()
                        if actual_teacher:
                            s['role'] = 'teacher'
                            student_name = f"{actual_teacher.first_name} {actual_teacher.last_name}".strip() or actual_teacher.fullname
                            s['fullname'] = student_name
                            s['id'] = teacher_id
                            enriched_students.append(s)
                            continue
                    else:
                        from apps.users.models import Student
                        actual_student = Student.objects.filter(id=predicted_id).first()

            # 2) Fallback: No sequential mocking anymore!
            # Only identify if sid is explicitly 'db_X' (already linked)
            if not actual_student and str(sid).startswith('db_'):
                from apps.users.models import Student
                try:
                    student_pk = int(str(sid).split('_')[1])
                    actual_student = Student.objects.filter(id=student_pk).first()
                except Exception:
                    pass
                
            if actual_student:
                student_name = f"{actual_student.first_name} {actual_student.last_name}"
                s['fullname'] = student_name
                s['id'] = actual_student.id
            enriched_students.append(s)
        return enriched_students

    @database_sync_to_async
    def get_recent_timeline(self, lesson_id):
        from apps.analytics.models import ActivityLog
        from django.db.models import Avg
        from django.db.models.functions import TruncSecond
        import datetime

        # Get the last 30 minutes of logs, grouped by 10-second intervals
        start_time = timezone.now() - datetime.timedelta(minutes=30)
        
        logs = ActivityLog.objects.filter(
            lesson_id=lesson_id,
            timestamp__gte=start_time
        ).values('timestamp').annotate(
            avg_eng=Avg('total_engagement_score')
        ).order_by('timestamp')

        # To avoid overwhelming the frontend, we'll sample or aggregate.
        # Simple version: return the last 20 data points
        results = []
        for log in list(logs)[-20:]:
            results.append({
                'timestamp': log['timestamp'].isoformat(),
                'avg_engagement': round(log['avg_eng'], 1) if log['avg_eng'] else 0
            })
        
        # If no real data yet, return empty list (let frontend handle 'Gathering data' state)
        return results

class DashboardConsumer(AsyncWebsocketConsumer):
    """Frontend subscribes here for live lesson stats."""
    async def connect(self):
        self.lesson_id = self.scope['url_route']['kwargs']['lesson_id']
        self.group_name = f'dashboard_{self.lesson_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def dashboard_update(self, event):
        logger.info(f"[Dashboard] Received update for lesson {self.lesson_id}")
        await self.send(text_data=json.dumps({
            'type': 'dashboard.update',
            'status': 'active',
            **event['data']
        }))

    async def lesson_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'lesson.ended',
            **event['data']
        }))


class AlertConsumer(AsyncWebsocketConsumer):
    """Frontend subscribes here for engagement alerts."""
    async def connect(self):
        self.lesson_id = self.scope['url_route']['kwargs']['lesson_id']
        self.group_name = f'alerts_{self.lesson_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def alert_low_engagement(self, event):
        await self.send(text_data=json.dumps({
            'type': 'alert.low_engagement',
            **event['data']
        }))
