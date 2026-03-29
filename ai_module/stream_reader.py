"""
Stream Reader Module
Captures video frames from RTSP, webcam, or demo source.
"""
import cv2
import time
import logging

logger = logging.getLogger(__name__)


class StreamReader:
    def __init__(self, source, fps_target=10):
        """
        Args:
            source: int (webcam index), str (RTSP URL or file path), or 'demo'
        """
        self.source = source
        self.fps_target = fps_target
        self.frame_interval = 1.0 / fps_target
        self.cap = None
        self.is_running = False

    def connect(self):
        if self.source == 'demo':
            # Use webcam 0 as demo fallback
            self.cap = cv2.VideoCapture(0)
        elif isinstance(self.source, str) and self.source.isdigit():
            self.cap = cv2.VideoCapture(int(self.source))
        else:
            self.cap = cv2.VideoCapture(self.source)

        if not self.cap.isOpened():
            raise ConnectionError(f'Cannot open video source: {self.source}')

        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.is_running = True
        logger.info(f'Stream connected: {self.source}')

    def read_frame(self):
        """Read one frame. Returns (success, frame)."""
        if not self.cap or not self.cap.isOpened():
            return False, None
        ret, frame = self.cap.read()
        if not ret:
            logger.warning('Failed to read frame from stream.')
        return ret, frame

    def reconnect(self, max_retries=5, delay=2):
        """Attempt to reconnect to stream."""
        for attempt in range(max_retries):
            logger.info(f'Reconnect attempt {attempt + 1}/{max_retries}...')
            time.sleep(delay)
            try:
                if self.cap:
                    self.cap.release()
                self.connect()
                return True
            except ConnectionError:
                continue
        logger.error('Max reconnect attempts reached.')
        return False

    def release(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        logger.info('Stream released.')
