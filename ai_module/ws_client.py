"""
WebSocket Client Module
Sends analyzed frame data to the Django backend via WebSocket.
"""
import asyncio
import json
import logging
import websockets
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class WSClient:
    def __init__(self, backend_url: str, lesson_id: int):
        """
        Args:
            backend_url: WebSocket base URL e.g. 'ws://localhost:8000'
            lesson_id: Active lesson ID
        """
        self.uri = f'{backend_url}/ws/stream/{lesson_id}/'
        self.connection = None
        self.lesson_id = lesson_id

    async def connect(self):
        try:
            self.connection = await websockets.connect(
                self.uri,
                ping_interval=20,
                ping_timeout=10,
            )
            logger.info(f'WebSocket connected: {self.uri}')
        except Exception as e:
            logger.error(f'WebSocket connection failed: {e}')
            raise

    async def send_frame_data(self, students: list, total_detected: int):
        """Send frame analysis result to backend."""
        if not self.connection:
            return

        payload = {
            'students': students,
            'total_detected': total_detected,
            'frame_timestamp': datetime.now(timezone.utc).isoformat(),
        }

        try:
            await self.connection.send(json.dumps(payload))
        except websockets.exceptions.ConnectionClosed:
            logger.warning('WebSocket connection closed. Attempting reconnect...')
            await self.reconnect()
        except Exception as e:
            logger.error(f'Failed to send frame data: {e}')

    async def reconnect(self):
        for attempt in range(5):
            await asyncio.sleep(2 ** attempt)
            try:
                await self.connect()
                logger.info('WebSocket reconnected.')
                return
            except Exception:
                logger.warning(f'Reconnect attempt {attempt+1} failed.')

    async def close(self):
        if self.connection:
            await self.connection.close()
            logger.info('WebSocket closed.')
