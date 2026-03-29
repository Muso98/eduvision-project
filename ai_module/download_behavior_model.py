"""
download_behavior_model.py
--------------------------
Download the student-behavior YOLOv8 weights from Roboflow (universe dataset).

Requirements:
    pip install roboflow

CLI:
    python download_behavior_model.py --api-key YOUR_KEY

Programmatic:
    from download_behavior_model import download_student_behavior_model
    path = download_student_behavior_model(os.environ["ROBOFLOW_API_KEY"])

Default output: <this_dir>/student_behavior.pt
"""

import argparse
import os
import shutil
import sys
from typing import Optional


def download_student_behavior_model(api_key: str, dest_dir: Optional[str] = None) -> Optional[str]:
    """
    Download YOLOv8 weights and copy the first .pt found to student_behavior.pt.

    Returns absolute path to student_behavior.pt on success, else None.
    """
    try:
        from roboflow import Roboflow
    except ImportError:
        print("ERROR: roboflow package not installed. pip install roboflow", file=sys.stderr)
        return None

    if dest_dir is None:
        dest_dir = os.path.dirname(os.path.abspath(__file__))
    dest_dir = os.path.normpath(dest_dir)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, 'student_behavior.pt')

    print("Connecting to Roboflow …")
    rf = Roboflow(api_key=api_key)

    workspace = rf.workspace("class-t58ex")
    project = workspace.project("student-behavior")
    version = project.version(15)

    print("Downloading YOLOv8 weights …")
    dataset = version.download("yolov8")

    found = None
    download_dir = dataset.location if hasattr(dataset, "location") else "."
    for root, _, files in os.walk(download_dir):
        for f in files:
            if f.endswith(".pt"):
                found = os.path.join(root, f)
                break
        if found:
            break

    if found:
        shutil.copy(found, dest)
        print(f"Model saved → {dest}")
        return dest

    print(
        "Could not find a .pt file in the downloaded folder.\n"
        f"Downloaded content is at: {download_dir}\n"
        "Move a .pt file manually to ai_module/student_behavior.pt",
        file=sys.stderr,
    )
    return None


def download(api_key: str) -> None:
    """CLI-compatible wrapper; exits non-zero on failure."""
    if not download_student_behavior_model(api_key):
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download student-behavior YOLO model from Roboflow")
    parser.add_argument("--api-key", required=True, help="Your Roboflow API key")
    args = parser.parse_args()
    download(args.api_key)
