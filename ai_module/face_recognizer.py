import cv2
import numpy as np
import requests
import urllib.request
import logging

logger = logging.getLogger(__name__)

class FaceRecognizer:
    def __init__(self, backend_url="http://localhost:8000"):
        self.backend_url = backend_url
        try:
            self.recognizer = cv2.face.LBPHFaceRecognizer_create()
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.available = True
        except Exception as e:
            logger.error(f"Error initializing OpenCV Face Recognizer: {e}")
            self.available = False
            
        self.trained = False
        self.labels_dict = {}

    def load_students(self, lesson_id: int):
        if not self.available:
            return
            
        endpoint = f"{self.backend_url}/api/lessons/{lesson_id}/students/"
        try:
            resp = requests.get(endpoint, timeout=10)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch students. Status: {resp.status_code}")
                return

            students = resp.json()
            faces = []
            ids = []
            
            for index, st in enumerate(students):
                photo_url = st.get('photo_url')
                student_id_str = st.get('id')

                if not photo_url:
                    continue
                
                try:
                    req = urllib.request.urlopen(photo_url)
                    arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
                    img = cv2.imdecode(arr, -1)
                    if img is None:
                        continue
                    
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    
                    detected = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
                    if len(detected) > 0:
                        (x, y, w, h) = detected[0]
                        face_crop = cv2.resize(gray[y:y+h, x:x+w], (200, 200))
                    else:
                        h, w = gray.shape
                        min_dim = min(h, w)
                        face_crop = cv2.resize(gray[(h-min_dim)//2:(h+min_dim)//2, (w-min_dim)//2:(w+min_dim)//2], (200, 200))
                        
                    faces.append(face_crop)
                    ids.append(index)
                    self.labels_dict[index] = student_id_str

                except Exception as e:
                    logger.warning(f"Error processing photo for {student_id_str}: {e}")
            
            if faces:
                self.recognizer.train(faces, np.array(ids))
                self.trained = True
                logger.info(f"Trained FaceRecognizer on {len(faces)} students.")

        except Exception as e:
            logger.error(f"Error loading students via API: {e}")

    def recognize(self, frame_crop):
        if not self.trained:
            return None
        
        try:
            if len(frame_crop.shape) == 3:
                gray = cv2.cvtColor(frame_crop, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame_crop

            detected = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
            if len(detected) > 0:
                (x, y, w, h) = detected[0]
                face = cv2.resize(gray[y:y+h, x:x+w], (200, 200))
                
                label, confidence = self.recognizer.predict(face)
                
                # Tightened LBPH threshold (65 is more conservative than 80)
                # Lower distance = Higher confidence
                if confidence < 65 and label in self.labels_dict:
                    logger.info(f"MATCH CONFIRMED: {self.labels_dict[label]} dist={confidence:.1f}")
                    return self.labels_dict[label]
            
            return None
        except Exception:
            return None
