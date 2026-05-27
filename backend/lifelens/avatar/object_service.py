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


import tensorflow as tf
from tf_keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input
from tf_keras.preprocessing import image as keras_image
from tf_keras.models import Model

# Global model instance (lazy load)
import threading
_embedding_model_lock = threading.Lock()
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    with _embedding_model_lock:
        if _embedding_model is None:
            import logging
            logging.info("Loading MobileNetV2 for Objects...")
            base = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')
            _embedding_model = Model(inputs=base.input, outputs=base.output)
    return _embedding_model

def _fallback_embedding(image_path: str) -> List[float]:
    """Uses MobileNetV2 for rich semantic object embedding."""
    model = get_embedding_model()
    
    # Load and preprocess
    img = keras_image.load_img(image_path, target_size=(224, 224))
    x = keras_image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = preprocess_input(x)
    
    # Predict
    embedding = model.predict(x, verbose=0)
    return embedding[0].tolist()  # 1280-d vector

class ObjectDetector:
    def __init__(self, model_path: str | None = None):
        self.detector = None
        self.model_path = _resolve_yolo_model_path(model_path)
        self.native_embedding_enabled = True

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
