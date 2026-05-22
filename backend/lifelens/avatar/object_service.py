"""
LifeLens Object Service — Strict YOLO Edition
==============================================
Object detection using Ultralytics YOLO with strict confidence gating.

Key change: ``conf=0.65`` is passed directly in the inference call
so YOLO's internal NMS already filters low-confidence detections —
no flickering, no false positives (like "BOTTLE" on a curtain).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from PIL import Image

from lifelens.avatar.config import settings

try:
    from ultralytics import YOLO  # type: ignore
except Exception:
    YOLO = None


OBJECT_EMBED_SIZE = 1280

# Strict confidence threshold — only show objects YOLO is very sure about.
YOLO_CONFIDENCE_THRESHOLD = 0.65


def _resolve_yolo_model_path(explicit_model_path: str | None = None) -> str:
    """Resolve YOLO model path from env overrides and known local locations."""
    project_root = Path(__file__).resolve().parents[2]
    candidates: list[Path] = []

    if explicit_model_path:
        candidates.append(Path(explicit_model_path))
    if settings.YOLO_MODEL_PATH:
        candidates.append(Path(settings.YOLO_MODEL_PATH))

    candidates.extend(
        [
            Path.cwd() / "yolov8n.pt",
            project_root / "yolov8n.pt",
            Path(__file__).resolve().parent / "yolov8n.pt",
            project_root / "portable_feature_pack" / "backend" / "yolov8n.pt",
        ]
    )

    seen: set[str] = set()
    for candidate in candidates:
        candidate_key = str(candidate)
        if candidate_key in seen:
            continue
        seen.add(candidate_key)

        if candidate.is_file():
            return candidate_key

    return explicit_model_path or settings.YOLO_MODEL_PATH or "yolov8n.pt"


def _fallback_embedding(image_path: str) -> List[float]:
    """Deterministic lightweight embedding used when TensorFlow is unavailable."""
    image = Image.open(image_path).convert("L").resize((40, 32))
    arr = np.asarray(image, dtype=np.float32) / 255.0
    vec = arr.flatten()  # 40*32=1280
    return vec.astype(np.float32).tolist()


class ObjectDetector:
    def __init__(self, model_path: str | None = None):
        self.detector = None
        self.model_path = _resolve_yolo_model_path(model_path)
        self.native_embedding_enabled = False  # Removed MobileNetV2 dependency

        if YOLO is not None:
            try:
                self.detector = YOLO(self.model_path)
            except Exception:
                self.detector = None

        self.detector_enabled = self.detector is not None

    def detect_objects(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Returns YOLO detections with STRICT confidence gating.

        The ``conf=0.65`` threshold is applied at the inference level,
        meaning YOLO discards uncertain detections before NMS — this
        eliminates flickering bounding boxes and false positives
        (e.g., detecting "bottle" on a curtain).
        """
        if self.detector is None:
            return []

        # Strict confidence gating — the critical fix
        results = self.detector(
            image_path,
            conf=YOLO_CONFIDENCE_THRESHOLD,
            verbose=False,
        )

        detections: List[Dict[str, Any]] = []
        for result in results:
            for box in result.boxes:
                detections.append(
                    {
                        "object": self.detector.names[int(box.cls[0])],
                        "confidence": float(box.conf[0]),
                        "box": box.xyxy[0].tolist(),
                    }
                )
        return detections

    def generate_embedding(self, image_path: str) -> List[float]:
        """
        Generates 1280-d embedding for the full image.

        Uses the fallback grayscale method since we've removed the
        heavy MobileNetV2 dependency. This is only used for Qdrant
        enrollment of custom objects — recognition uses YOLO directly.
        """
        return _fallback_embedding(image_path)


detector = ObjectDetector()
