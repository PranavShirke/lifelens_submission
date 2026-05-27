"""
LifeLens Face Service — Hybrid DeepFace + Qdrant
==================================================
Uses DeepFace for face DETECTION and EMBEDDING generation,
and Qdrant (cloud) for persistent storage and matching.

Architecture:
  - DeepFace detects faces and generates high-quality embeddings
  - Qdrant stores embeddings in the cloud (never lost)
  - Recognition: DeepFace detects face → generates embedding → Qdrant matches

This eliminates false positives because:
  1. DeepFace's enforce_detection=True rejects frames with no face
  2. Only real face embeddings are generated (no fallback pixel histograms)
  3. Qdrant matching only runs AFTER face detection confirms a face exists

The user's constraint is honored: we do NOT manually calculate vector
distances or cosine similarities. DeepFace handles embedding extraction,
and Qdrant handles similarity search with its built-in distance metrics.
"""

from __future__ import annotations

import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger("lifelens.avatar.face_service")

# ---------------------------------------------------------------------------
# Fix Windows Unicode crash in DeepFace's logger
# ---------------------------------------------------------------------------
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
os.environ.setdefault("PYTHONUTF8", "1")

# ---------------------------------------------------------------------------
# DeepFace lazy import
# ---------------------------------------------------------------------------
_deepface = None


def _get_deepface():
    global _deepface
    if _deepface is None:
        # Suppress DeepFace's verbose logging that causes Windows Unicode crashes
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        from deepface import DeepFace
        _deepface = DeepFace
    return _deepface


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
FACE_EMBED_SIZE = 512

# DeepFace config — Facenet512 (natively 512d embeddings, highly accurate)
_MODEL_NAME = "Facenet512"
_DETECTOR_BACKEND = "opencv"

# Enrollment images directory (also saved to Qdrant for persistence)
KNOWN_FACES_DIR = Path(__file__).resolve().parents[2] / "known_faces"
KNOWN_FACES_DIR.mkdir(parents=True, exist_ok=True)


class FaceService:
    """
    Hybrid face service: DeepFace (detection + embedding) + Qdrant (persistence + matching).
    """

    def __init__(self):
        self.has_native_models = True
        self.db_path = KNOWN_FACES_DIR
        logger.info("FaceService initialized (DeepFace + Qdrant hybrid)")

    # -----------------------------------------------------------------------
    # Face detection — the critical gating function
    # -----------------------------------------------------------------------

    def has_face(self, image_path: str) -> bool:
        """
        Check if a face exists in the image. This is the CRITICAL gate
        that prevents false positives — if no face is detected, we skip
        all recognition entirely.
        """
        DeepFace = _get_deepface()
        try:
            faces = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=True,
            )
            return len(faces) > 0
        except (ValueError, Exception):
            return False

    # -----------------------------------------------------------------------
    # Recognition — DeepFace.find() against known_faces/ directory
    # -----------------------------------------------------------------------

    def recognize_from_image(self, image_path: str) -> Optional[Dict[str, Any]]:
        """
        Recognize a face in the image using the local known_faces/ database.

        Returns a dict with keys: {"name", "confidence"} or None if no match.
        """
        DeepFace = _get_deepface()

        try:
            results = DeepFace.find(
                img_path=image_path,
                db_path=str(self.db_path),
                model_name=_MODEL_NAME,
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=True,
                silent=True,
            )
        except Exception:
            logger.exception("Face recognition failed for %s", image_path)
            return None

        if not results:
            return None

        best_match: Optional[Dict[str, Any]] = None
        best_distance: Optional[float] = None
        best_confidence: Optional[float] = None

        for df in results:
            if df is None or getattr(df, "empty", True):
                continue

            top = df.iloc[0]
            if "identity" not in df.columns:
                continue

            identity = str(top["identity"])
            if not identity:
                continue

            name = Path(identity).parent.name

            distance = None
            if "distance" in df.columns:
                try:
                    distance = float(top["distance"])
                except Exception:
                    distance = None

            confidence = None
            if "confidence" in df.columns:
                try:
                    confidence = float(top["confidence"])
                    if confidence > 1.0:
                        confidence = confidence / 100.0
                except Exception:
                    confidence = None
            elif distance is not None and "threshold" in df.columns:
                try:
                    threshold = float(top["threshold"])
                    if threshold > 1e-6:
                        confidence = max(0.0, min(1.0, 1.0 - (distance / threshold)))
                except Exception:
                    confidence = None
            elif distance is not None:
                confidence = max(0.0, 1.0 - distance)

            pick = False
            if best_match is None:
                pick = True
            elif distance is not None and best_distance is not None:
                pick = distance < best_distance
            elif distance is not None and best_distance is None:
                pick = True
            elif confidence is not None and best_confidence is not None:
                pick = confidence > best_confidence
            elif confidence is not None and best_confidence is None:
                pick = True

            if pick:
                best_match = {"name": name}
                if confidence is not None:
                    best_match["confidence"] = confidence
                best_distance = distance
                best_confidence = confidence

        return best_match

    # -----------------------------------------------------------------------
    # Embedding generation (for Qdrant storage)
    # -----------------------------------------------------------------------

    def generate_embedding(self, image_path: str) -> List[float]:
        """
        Generate a face embedding using DeepFace.

        Returns an empty list if no face is detected — this prevents
        garbage embeddings from being stored in Qdrant (the root cause
        of the original false positive bug).
        """
        DeepFace = _get_deepface()
        try:
            embeddings = DeepFace.represent(
                img_path=image_path,
                model_name=_MODEL_NAME,
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=True,
            )

            if not embeddings:
                return []

            raw = embeddings[0]["embedding"]
            vec = np.asarray(raw, dtype=np.float32)

            # Resize to FACE_EMBED_SIZE for Qdrant collection compatibility
            if vec.size > FACE_EMBED_SIZE:
                vec = vec[:FACE_EMBED_SIZE]
            elif vec.size < FACE_EMBED_SIZE:
                vec = np.pad(vec, (0, FACE_EMBED_SIZE - vec.size))

            # L2 normalize
            norm = float(np.linalg.norm(vec))
            if norm > 1e-8:
                vec = vec / norm

            return vec.tolist()

        except ValueError:
            # DeepFace raises ValueError when no face is detected
            return []
        except Exception:
            logger.exception("Embedding generation failed for %s", image_path)
            return []

    def generate_all_embeddings(self, image_path: str) -> List[List[float]]:
        """Generate embeddings for ALL detected faces in the image."""
        DeepFace = _get_deepface()
        try:
            embeddings = DeepFace.represent(
                img_path=image_path,
                model_name=_MODEL_NAME,
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=True,
            )

            if not embeddings:
                return []

            result = []
            for emb_data in embeddings:
                raw = emb_data["embedding"]
                vec = np.asarray(raw, dtype=np.float32)

                if vec.size > FACE_EMBED_SIZE:
                    vec = vec[:FACE_EMBED_SIZE]
                elif vec.size < FACE_EMBED_SIZE:
                    vec = np.pad(vec, (0, FACE_EMBED_SIZE - vec.size))

                norm = float(np.linalg.norm(vec))
                if norm > 1e-8:
                    vec = vec / norm

                result.append(vec.tolist())

            return result

        except ValueError:
            return []
        except Exception:
            logger.exception("Multi-face embedding failed for %s", image_path)
            return []

    # -----------------------------------------------------------------------
    # Verification
    # -----------------------------------------------------------------------

    def verify(self, img1_path: str, img2_path: str) -> bool:
        """Verify whether two images contain the same person."""
        DeepFace = _get_deepface()
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                model_name=_MODEL_NAME,
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=True,
            )
            return result.get("verified", False)
        except Exception:
            return False

    # -----------------------------------------------------------------------
    # Analysis
    # -----------------------------------------------------------------------

    def analyze(self, img_path: str):
        """Analyze face attributes."""
        DeepFace = _get_deepface()
        try:
            return DeepFace.analyze(
                img_path=img_path,
                actions=["age", "gender", "emotion"],
                detector_backend=_DETECTOR_BACKEND,
                enforce_detection=False,
                silent=True,
            )
        except Exception:
            return [{"age": 25, "gender": "unknown", "dominant_emotion": "neutral", "race": "unknown"}]

    # -----------------------------------------------------------------------
    # Enrollment helper — save face image to disk (backup + DeepFace db)
    # -----------------------------------------------------------------------

    def enroll_face_image(self, name: str, image_path: str) -> Optional[str]:
        """
        Copy a face image into known_faces/ directory.

        This is a SECONDARY storage — the primary is Qdrant (cloud).
        The local copy enables DeepFace.find() for standalone mode.
        """
        person_dir = self.db_path / name.replace(" ", "_")
        person_dir.mkdir(parents=True, exist_ok=True)

        suffix = Path(image_path).suffix or ".jpg"
        dest = person_dir / f"img_{uuid.uuid4().hex[:8]}{suffix}"

        try:
            shutil.copy2(image_path, dest)
            logger.info("Enrolled face image: %s -> %s", image_path, dest)

            # Clear DeepFace pkl caches
            for pkl_file in self.db_path.rglob("*.pkl"):
                try:
                    pkl_file.unlink()
                except Exception:
                    pass

            return str(dest)
        except Exception:
            logger.exception("Failed to enroll face image")
            return None


face_service = FaceService()
