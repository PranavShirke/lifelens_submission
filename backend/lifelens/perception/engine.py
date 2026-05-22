"""
LifeLens Perception Engine
==========================
Real-time Face Recognition + Object Detection for proactive eldercare.

Architecture
------------
- **FaceRecognizer**  : Wraps ``deepface.DeepFace.find()`` — zero manual math.
- **ObjectDetector**   : Wraps ``ultralytics.YOLO`` with strict confidence gating.
- **PerceptionEngine** : Orchestrates both modules over a live OpenCV webcam feed.

Face recognition runs asynchronously on every Nth frame so the video
loop never blocks.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("lifelens.perception")

# ---------------------------------------------------------------------------
# Configuration dataclass
# ---------------------------------------------------------------------------

@dataclass
class PerceptionConfig:
    """All tunables live here — easy to override from CLI or .env."""

    # Path to directory of known faces.  Structure:
    #   known_faces/
    #       pranav/
    #           img1.jpg
    #           img2.jpg
    #       caregiver_anita/
    #           img1.jpg
    known_faces_dir: str = "known_faces"

    # YOLO
    yolo_model_name: str = "yolov8n.pt"
    yolo_confidence: float = 0.65

    # DeepFace
    deepface_detector_backend: str = "opencv"       # fastest for real-time
    deepface_model_name: str = "VGG-Face"            # good accuracy-speed balance
    deepface_distance_metric: str = "cosine"

    # Frame-skip for face recognition (run every Nth frame)
    face_recognition_interval: int = 15

    # OpenCV capture device index
    camera_index: int = 0

    # Display
    window_name: str = "LifeLens Perception HUD"
    font: int = cv2.FONT_HERSHEY_SIMPLEX
    font_scale: float = 0.6
    font_thickness: int = 2


# ---------------------------------------------------------------------------
# Face Recognizer
# ---------------------------------------------------------------------------

class FaceRecognizer:
    """
    Wraps DeepFace.find() for label-based face recognition.

    DeepFace internally:
      1. Detects faces in the query image.
      2. Extracts embeddings.
      3. Computes distances against every image in ``db_path``.
      4. Applies its own threshold to return matches.

    We never touch a single cosine / euclidean formula.
    """

    def __init__(self, config: PerceptionConfig) -> None:
        self._config = config
        self._db_path = Path(config.known_faces_dir).resolve()
        self._ready = False

        # Thread-safe latest results
        self._lock = threading.Lock()
        self._latest_results: List[Dict] = []
        self._is_processing = False

    # -- public API ----------------------------------------------------------

    def validate_database(self) -> bool:
        """Ensure the known-faces directory exists and has sub-folders."""
        if not self._db_path.exists():
            logger.warning(
                "Known-faces directory not found at %s — creating it now.",
                self._db_path,
            )
            self._db_path.mkdir(parents=True, exist_ok=True)

        subdirs = [
            d for d in self._db_path.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ]
        if not subdirs:
            logger.warning(
                "No identity folders found in %s. "
                "Add sub-folders named after each person (e.g., /pranav/).",
                self._db_path,
            )
            return False

        identities = [d.name for d in subdirs]
        logger.info(
            "Face database ready — %d identities: %s",
            len(identities),
            ", ".join(identities),
        )
        self._ready = True
        return True

    def recognize_async(self, frame: np.ndarray) -> None:
        """
        Kick off face recognition in a background thread.

        If a recognition job is already running, this call is a no-op
        (we never queue — the latest frame wins).
        """
        with self._lock:
            if self._is_processing:
                return
            self._is_processing = True

        thread = threading.Thread(
            target=self._recognize_worker,
            args=(frame.copy(),),
            daemon=True,
        )
        thread.start()

    def get_latest_results(self) -> List[Dict]:
        """Return the most recently computed recognition results."""
        with self._lock:
            return list(self._latest_results)

    # -- internals -----------------------------------------------------------

    def _recognize_worker(self, frame: np.ndarray) -> None:
        """Background worker — calls DeepFace.find() and parses results."""
        try:
            # Import lazily so the module loads fast even if deepface
            # takes a moment to warm up.
            from deepface import DeepFace

            results = DeepFace.find(
                img_path=frame,
                db_path=str(self._db_path),
                model_name=self._config.deepface_model_name,
                detector_backend=self._config.deepface_detector_backend,
                distance_metric=self._config.deepface_distance_metric,
                enforce_detection=False,   # don't crash when no face found
                silent=True,
            )

            parsed = self._parse_results(results)

            with self._lock:
                self._latest_results = parsed

        except Exception:
            logger.exception("Face recognition failed on this frame")

        finally:
            with self._lock:
                self._is_processing = False

    @staticmethod
    def _parse_results(results) -> List[Dict]:
        """
        ``DeepFace.find()`` returns a list of DataFrames — one per
        detected face.  Each DataFrame rows are the matching images
        sorted by distance.  We extract the identity (folder name)
        from the top match.
        """
        parsed: List[Dict] = []

        for df in results:
            if df.empty:
                continue

            # The "identity" column holds the full path of the matching image.
            # The parent directory name IS the person's label.
            top_match_path = Path(str(df.iloc[0]["identity"]))
            label = top_match_path.parent.name

            # Bounding box of the detected face in the *query* image.
            # DeepFace ≥ 0.0.80 provides source_x/y/w/h columns.
            face_box = {}
            for key in ("source_x", "source_y", "source_w", "source_h"):
                if key in df.columns:
                    face_box[key.replace("source_", "")] = int(df.iloc[0][key])

            parsed.append({"label": label, "box": face_box})

        return parsed


# ---------------------------------------------------------------------------
# Object Detector
# ---------------------------------------------------------------------------

class ObjectDetector:
    """Wraps Ultralytics YOLO for rigid-object detection."""

    def __init__(self, config: PerceptionConfig) -> None:
        self._config = config
        self._model = None

    def load_model(self) -> None:
        """Download (if needed) and cache the YOLO model."""
        from ultralytics import YOLO

        logger.info("Loading YOLO model: %s …", self._config.yolo_model_name)
        self._model = YOLO(self._config.yolo_model_name)
        logger.info("YOLO model loaded successfully.")

    def detect(self, frame: np.ndarray) -> List[Dict]:
        """
        Run inference on a single frame.

        Returns a list of dicts::

            {
                "label": "cup",
                "confidence": 0.87,
                "box": (x1, y1, x2, y2),  # pixel coords
            }
        """
        if self._model is None:
            return []

        # Strict confidence gating — the model itself discards anything
        # below this threshold, eliminating flicker / false positives.
        results = self._model(
            frame,
            conf=self._config.yolo_confidence,
            verbose=False,
        )

        detections: List[Dict] = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = result.names[cls_id]
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "box": (int(x1), int(y1), int(x2), int(y2)),
                })

        return detections


# ---------------------------------------------------------------------------
# HUD Renderer
# ---------------------------------------------------------------------------

class HUDRenderer:
    """Draws bounding boxes, labels, and status info onto OpenCV frames."""

    # Colour palette (BGR)
    COLOR_FACE_BOX    = (0, 230, 118)    # green
    COLOR_FACE_LABEL  = (0, 230, 118)
    COLOR_OBJ_BOX     = (255, 179, 0)    # amber
    COLOR_OBJ_LABEL   = (255, 179, 0)
    COLOR_UNKNOWN      = (0, 0, 255)     # red
    COLOR_STATUS_BG   = (30, 30, 30)
    COLOR_STATUS_FG   = (200, 200, 200)

    def __init__(self, config: PerceptionConfig) -> None:
        self._cfg = config

    def draw_face_results(
        self, frame: np.ndarray, faces: List[Dict],
    ) -> np.ndarray:
        """Overlay face recognition boxes + identity labels."""
        for face in faces:
            box = face.get("box", {})
            label = face.get("label", "Unknown")

            x = box.get("x", 0)
            y = box.get("y", 0)
            w = box.get("w", 0)
            h = box.get("h", 0)

            if w == 0 or h == 0:
                continue

            color = self.COLOR_FACE_BOX if label.lower() != "unknown" else self.COLOR_UNKNOWN

            # Bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            # Label background
            display_label = label.title()
            (tw, th), _ = cv2.getTextSize(
                display_label,
                self._cfg.font,
                self._cfg.font_scale,
                self._cfg.font_thickness,
            )
            cv2.rectangle(
                frame,
                (x, y - th - 10),
                (x + tw + 8, y),
                color,
                cv2.FILLED,
            )
            cv2.putText(
                frame,
                display_label,
                (x + 4, y - 6),
                self._cfg.font,
                self._cfg.font_scale,
                (0, 0, 0),
                self._cfg.font_thickness,
                cv2.LINE_AA,
            )

        return frame

    def draw_object_detections(
        self, frame: np.ndarray, detections: List[Dict],
    ) -> np.ndarray:
        """Overlay YOLO object detection boxes + labels."""
        for det in detections:
            x1, y1, x2, y2 = det["box"]
            label = det["label"]
            conf = det["confidence"]
            display = f"{label} {conf:.0%}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), self.COLOR_OBJ_BOX, 2)

            (tw, th), _ = cv2.getTextSize(
                display,
                self._cfg.font,
                self._cfg.font_scale,
                self._cfg.font_thickness,
            )
            cv2.rectangle(
                frame,
                (x1, y1 - th - 10),
                (x1 + tw + 8, y1),
                self.COLOR_OBJ_BOX,
                cv2.FILLED,
            )
            cv2.putText(
                frame,
                display,
                (x1 + 4, y1 - 6),
                self._cfg.font,
                self._cfg.font_scale,
                (0, 0, 0),
                self._cfg.font_thickness,
                cv2.LINE_AA,
            )

        return frame

    def draw_status_bar(
        self,
        frame: np.ndarray,
        fps: float,
        face_count: int,
        obj_count: int,
    ) -> np.ndarray:
        """Render a translucent status bar at the top of the frame."""
        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 36), self.COLOR_STATUS_BG, cv2.FILLED)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        status = (
            f"LifeLens Perception  |  FPS: {fps:.1f}  |  "
            f"Faces: {face_count}  |  Objects: {obj_count}"
        )
        cv2.putText(
            frame, status, (10, 25),
            self._cfg.font, 0.55, self.COLOR_STATUS_FG, 1, cv2.LINE_AA,
        )
        return frame


# ---------------------------------------------------------------------------
# Perception Engine  (main orchestrator)
# ---------------------------------------------------------------------------

class PerceptionEngine:
    """
    Top-level controller that wires together face recognition,
    object detection, and the live OpenCV display loop.

    Usage::

        engine = PerceptionEngine()
        engine.initialize_models()
        engine.run()          # blocks until user presses 'q'
    """

    def __init__(self, config: Optional[PerceptionConfig] = None) -> None:
        self._config = config or PerceptionConfig()
        self._face_recognizer = FaceRecognizer(self._config)
        self._object_detector = ObjectDetector(self._config)
        self._hud = HUDRenderer(self._config)
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_count: int = 0

    # -- public API ----------------------------------------------------------

    def initialize_models(self) -> None:
        """Load all ML models and validate the face database."""
        logger.info("=" * 60)
        logger.info("  LifeLens Perception Engine — Initializing")
        logger.info("=" * 60)

        # 1. Face recognition database
        self._face_recognizer.validate_database()

        # 2. YOLO object detector
        self._object_detector.load_model()

        logger.info("All models initialized. Ready to process frames.")

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Run the full perception pipeline on a single frame:
          1. Object detection   (every frame)
          2. Face recognition   (every Nth frame, async)
          3. HUD overlay

        Returns the annotated frame.
        """
        self._frame_count += 1

        # --- Object Detection (runs every frame — YOLO-nano is fast) -------
        detections = self._object_detector.detect(frame)

        # --- Face Recognition (async, every Nth frame) ---------------------
        if (
            self._frame_count % self._config.face_recognition_interval == 0
            and self._face_recognizer._ready
        ):
            self._face_recognizer.recognize_async(frame)

        face_results = self._face_recognizer.get_latest_results()

        # --- Draw HUD -------------------------------------------------------
        frame = self._hud.draw_object_detections(frame, detections)
        frame = self._hud.draw_face_results(frame, face_results)

        return frame, detections, face_results

    def run(self) -> None:
        """
        Main video loop.  Captures from the webcam, processes each
        frame, and displays the annotated output.

        Press **q** to exit gracefully.
        """
        self._cap = cv2.VideoCapture(self._config.camera_index)

        if not self._cap.isOpened():
            logger.error(
                "Cannot open camera (index=%d). "
                "Check your webcam connection.",
                self._config.camera_index,
            )
            return

        logger.info(
            "Camera opened. Press 'q' to quit. "
            "Face recognition runs every %d frames.",
            self._config.face_recognition_interval,
        )

        fps = 0.0
        prev_time = time.time()

        try:
            while True:
                ret, frame = self._cap.read()
                if not ret:
                    logger.warning("Failed to grab frame — retrying…")
                    continue

                # Process
                annotated, detections, faces = self.process_frame(frame)

                # FPS calculation
                now = time.time()
                fps = 1.0 / max(now - prev_time, 1e-6)
                prev_time = now

                # Status bar
                annotated = self._hud.draw_status_bar(
                    annotated, fps, len(faces), len(detections),
                )

                # Display
                cv2.imshow(self._config.window_name, annotated)

                # Graceful exit: 'q' key
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    logger.info("User pressed 'q' — shutting down.")
                    break

        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt — shutting down.")

        finally:
            self._shutdown()

    # -- internals -----------------------------------------------------------

    def _shutdown(self) -> None:
        """Release resources cleanly."""
        if self._cap is not None:
            self._cap.release()
        cv2.destroyAllWindows()
        logger.info("Perception engine shut down gracefully.")
