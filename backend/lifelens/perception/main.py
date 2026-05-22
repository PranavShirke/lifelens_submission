#!/usr/bin/env python3
"""
LifeLens Perception — Entry Point
==================================
Launch the real-time perception HUD with a single command::

    python -m lifelens.perception.main

Optional CLI flags
------------------
--camera          Webcam index (default: 0)
--known-faces     Path to the known-faces directory
--yolo-model      YOLO model file (default: yolov8n.pt)
--yolo-conf       YOLO confidence threshold (default: 0.65)
--face-interval   Run face recognition every N frames (default: 15)

Example::

    python -m lifelens.perception.main \
        --camera 0 \
        --known-faces ./known_faces \
        --yolo-conf 0.70 \
        --face-interval 20
"""

from __future__ import annotations

import argparse
import sys

from .engine import PerceptionConfig, PerceptionEngine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="LifeLens Perception Engine — Real-time Face & Object Detection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=0,
        help="Webcam device index (default: 0)",
    )
    parser.add_argument(
        "--known-faces",
        type=str,
        default="known_faces",
        help="Path to directory of known-face sub-folders (default: known_faces/)",
    )
    parser.add_argument(
        "--yolo-model",
        type=str,
        default="yolov8n.pt",
        help="YOLO model weights (default: yolov8n.pt)",
    )
    parser.add_argument(
        "--yolo-conf",
        type=float,
        default=0.65,
        help="YOLO confidence threshold (default: 0.65)",
    )
    parser.add_argument(
        "--face-interval",
        type=int,
        default=15,
        help="Run face recognition every N frames (default: 15)",
    )
    parser.add_argument(
        "--deepface-model",
        type=str,
        default="VGG-Face",
        help="DeepFace recognition model (default: VGG-Face)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    config = PerceptionConfig(
        camera_index=args.camera,
        known_faces_dir=args.known_faces,
        yolo_model_name=args.yolo_model,
        yolo_confidence=args.yolo_conf,
        face_recognition_interval=args.face_interval,
        deepface_model_name=args.deepface_model,
    )

    engine = PerceptionEngine(config)

    try:
        engine.initialize_models()
        engine.run()
    except Exception:
        import logging
        logging.getLogger("lifelens.perception").exception("Fatal error")
        sys.exit(1)


if __name__ == "__main__":
    main()
