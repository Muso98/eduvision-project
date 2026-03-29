import cv2
import numpy as np
from django.utils import timezone
from apps.users.models import Student
import logging

logger = logging.getLogger(__name__)

class FaceRecognizer:
    def __init__(self):
        self.recognizer = cv2.face.LBPHFaceRecognizer_create()
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.is_trained = False
        self.last_train_time = None
        self.student_map = {} # Maps LBPH label (int) to Student ID (int)

    def train_from_db(self):
        logger.info("Training face recognizer from database...")
        faces = []
        labels = []
        from apps.users.models import Student, CustomUser
        
        # 1. Train on Students
        students = Student.objects.exclude(photo='')
        for student in students:
            try:
                img = cv2.imread(student.photo.path, cv2.IMREAD_GRAYSCALE)
                if img is None:
                    continue
                detected_faces = self.face_cascade.detectMultiScale(img, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                if len(detected_faces) > 0:
                    (x, y, w, h) = detected_faces[0]
                    face_roi = img[y:y+h, x:x+w]
                else:
                    face_roi = img
                face_roi = cv2.equalizeHist(face_roi)
                face_roi = cv2.resize(face_roi, (100, 100))
                
                faces.append(face_roi)
                labels.append(student.id)
                faces.append(face_roi)
                labels.append(student.id)
                faces.append(cv2.convertScaleAbs(face_roi, alpha=0.7, beta=0))
                labels.append(student.id)
                faces.append(cv2.convertScaleAbs(face_roi, alpha=1.3, beta=0))
                labels.append(student.id)
                # Low-res augmentation for distant faces
                low_res = cv2.resize(cv2.resize(face_roi, (40, 40)), (100, 100))
                faces.append(low_res)
                labels.append(student.id)
                faces.append(cv2.flip(face_roi, 1))
                labels.append(student.id)
                self.student_map[student.id] = student.id
            except Exception as e:
                logger.error(f"Error training student {student.id}: {e}")

        # 2. Train on Teachers (CustomUser)
        teachers = CustomUser.objects.exclude(photo='')
        for teacher in teachers:
            try:
                img = cv2.imread(teacher.photo.path, cv2.IMREAD_GRAYSCALE)
                if img is None:
                    continue
                detected_faces = self.face_cascade.detectMultiScale(img, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                if len(detected_faces) > 0:
                    (x, y, w, h) = detected_faces[0]
                    face_roi = img[y:y+h, x:x+w]
                else:
                    face_roi = img
                face_roi = cv2.equalizeHist(face_roi)
                face_roi = cv2.resize(face_roi, (100, 100))
                
                # Offset teacher label by 1,000,000
                lbl = teacher.id + 1000000
                faces.append(face_roi)
                labels.append(lbl)
                faces.append(cv2.convertScaleAbs(face_roi, alpha=0.7, beta=0))
                labels.append(lbl)
                faces.append(cv2.convertScaleAbs(face_roi, alpha=1.3, beta=0))
                labels.append(lbl)
                # Low-res augmentation for distant faces
                low_res = cv2.resize(cv2.resize(face_roi, (40, 40)), (100, 100))
                faces.append(low_res)
                labels.append(lbl)
                faces.append(cv2.flip(face_roi, 1))
                labels.append(lbl)
                self.student_map[lbl] = lbl
            except Exception as e:
                logger.error(f"Error training teacher {teacher.id}: {e}")
        
        if faces:
            self.recognizer.train(faces, np.array(labels))
            self.is_trained = True
            self.last_train_time = timezone.now()
            logger.info(f"Successfully trained on {len(faces)} photos.")
        else:
            logger.warning("No photos found for training.")

    def recognize_face(self, frame_img, bbox):
        """
        frame_img: numpy array of the frame (BGR)
        bbox: dict from MediaPipe - {'xCenter': float, 'yCenter': float, 'width': float, 'height': float}
              OR legacy format - {'xMin': float, 'yMin': float, 'width': float, 'height': float}
        Returns: label id or None
        """
        if not self.is_trained:
            return None
            
        try:
            h, w = frame_img.shape[:2]
            
            # MediaPipe uses xCenter/yCenter normalized coords
            if 'xCenter' in bbox:
                cx = bbox['xCenter']
                cy = bbox['yCenter']
                bw = bbox['width']
                bh = bbox['height']
                xMin = max(0, int((cx - bw / 2) * w))
                yMin = max(0, int((cy - bh / 2) * h))
                width_px = min(w - xMin, int(bw * w))
                height_px = min(h - yMin, int(bh * h))
            else:
                # legacy xMin/yMin format
                xMin = max(0, int(bbox.get('xMin', 0) * w))
                yMin = max(0, int(bbox.get('yMin', 0) * h))
                width_px = min(w - xMin, int(bbox.get('width', 0) * w))
                height_px = min(h - yMin, int(bbox.get('height', 0) * h))
            
            if width_px < 10 or height_px < 10:
                return None
                
            face_crop = frame_img[yMin:yMin+height_px, xMin:xMin+width_px]
            
            if len(face_crop.shape) == 3:
                face_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            else:
                face_gray = face_crop
                
            face_gray = cv2.equalizeHist(cv2.resize(face_gray, (100, 100)))
            
            label, confidence = self.recognizer.predict(face_gray)
            
            # LBPH distance < 85 is a more conservative match.
            if confidence < 85:
                logger.info(f"AI MATCH: id={label} (confidence={confidence:.1f})")
                return label
                
            logger.debug(f"AI Ignored: id={label} dist={confidence:.1f}")
            return None
        except Exception as e:
            logger.error(f"Recognition error: {e}")
            return None

face_recognizer_instance = FaceRecognizer()

def get_recognizer():
    if not face_recognizer_instance.is_trained:
        face_recognizer_instance.train_from_db()
    return face_recognizer_instance
