"""
Simple SORT-based tracker for student IDs across frames.
Assigns persistent temp IDs to detected students.
"""
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class TrackedStudent:
    student_id: str
    bbox: List[int]  # [x1, y1, x2, y2]
    age: int = 0         # frames since last seen
    hits: int = 1        # total frame appearances
    center_history: List = field(default_factory=list)


def iou(box1, box2):
    """Compute IoU between two bounding boxes [x1,y1,x2,y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0


class StudentTracker:
    def __init__(self, iou_threshold=0.3, max_age=30):
        """
        Args:
            iou_threshold: Minimum IoU to match detection with track
            max_age: Frames to keep a track alive without detections
        """
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.tracks: Dict[str, TrackedStudent] = {}
        self._next_id = 1

    def _new_id(self):
        sid = f'student_{self._next_id}'
        self._next_id += 1
        return sid

    def update(self, detections: List[Dict]) -> List[Dict]:
        """
        Update tracker with new detections.

        Args:
            detections: [{'bbox': [...], 'confidence': float}]

        Returns:
            List of tracked students: [{'temp_student_id': str, 'bbox': [...], ...}]
        """
        det_bboxes = [d['bbox'] for d in detections]

        # Age all existing tracks
        for track in self.tracks.values():
            track.age += 1

        # Greedy IoU matching
        matched_track_ids = set()
        matched_det_indices = set()

        track_keys = list(self.tracks.keys())
        for det_idx, det_bbox in enumerate(det_bboxes):
            best_iou = self.iou_threshold
            best_track_id = None
            for tid in track_keys:
                if tid in matched_track_ids:
                    continue
                score = iou(det_bbox, self.tracks[tid].bbox)
                if score > best_iou:
                    best_iou = score
                    best_track_id = tid

            if best_track_id:
                self.tracks[best_track_id].bbox = det_bbox
                self.tracks[best_track_id].age = 0
                self.tracks[best_track_id].hits += 1
                self.tracks[best_track_id].center_history.append(
                    [(det_bbox[0]+det_bbox[2])//2, (det_bbox[1]+det_bbox[3])//2]
                )
                matched_track_ids.add(best_track_id)
                matched_det_indices.add(det_idx)

        # Create new tracks for unmatched detections
        for det_idx, det_bbox in enumerate(det_bboxes):
            if det_idx not in matched_det_indices:
                new_id = self._new_id()
                self.tracks[new_id] = TrackedStudent(
                    student_id=new_id,
                    bbox=det_bbox,
                    center_history=[[(det_bbox[0]+det_bbox[2])//2, (det_bbox[1]+det_bbox[3])//2]]
                )

        # Remove stale tracks
        self.tracks = {
            tid: t for tid, t in self.tracks.items()
            if t.age <= self.max_age
        }

        # Return active tracks (seen at least once recently)
        active = []
        for tid, track in self.tracks.items():
            if track.age == 0:  # was matched this frame
                active.append({
                    'temp_student_id': track.student_id,
                    'bbox': track.bbox,
                    'hits': track.hits,
                })

        return active
