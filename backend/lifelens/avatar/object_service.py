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

try:
    from tensorflow.keras.applications.mobilenet_v2 import (  # type: ignore
        MobileNetV2,
        preprocess_input,
    )
    from tensorflow.keras.models import Model  # type: ignore
    from tensorflow.keras.preprocessing import image as keras_image  # type: ignore
except Exception:
    MobileNetV2 = None
    preprocess_input = None
    Model = None
    keras_image = None


OBJECT_EMBED_SIZE = 1280
_embedding_model = None


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


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        if MobileNetV2 is None or Model is None:
            return None
        base = MobileNetV2(weights="imagenet", include_top=False, pooling="avg")
        _embedding_model = Model(inputs=base.input, outputs=base.output)
    return _embedding_model


class ObjectDetector:
    def __init__(self, model_path: str | None = None):
        self.detector = None
        self.model_path = _resolve_yolo_model_path(model_path)
        self.native_embedding_enabled = bool(
            MobileNetV2 is not None and Model is not None and keras_image is not None and preprocess_input is not None
        )
        if YOLO is not None:
            try:
                self.detector = YOLO(self.model_path)
            except Exception:
                self.detector = None

        self.detector_enabled = self.detector is not None

    def detect_objects(self, image_path: str) -> List[Dict[str, Any]]:
        """Returns YOLO detections if available, otherwise an empty list."""
        if self.detector is None:
            return []

        results = self.detector(image_path)
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
        """Generates 1280-d embedding for the full image, with a fallback on unsupported runtimes."""
        model = get_embedding_model()
        if model is None or keras_image is None or preprocess_input is None:
            return _fallback_embedding(image_path)

        img = keras_image.load_img(image_path, target_size=(224, 224))
        x = keras_image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = preprocess_input(x)
        embedding = model.predict(x, verbose=0)
        return embedding[0].tolist()


detector = ObjectDetector()
