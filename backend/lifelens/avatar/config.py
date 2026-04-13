import os
from lifelens.config import GROQ_API_KEY as CORE_GROQ_API_KEY
from lifelens.config import QDRANT_API_KEY as CORE_QDRANT_API_KEY
from lifelens.config import QDRANT_URL as CORE_QDRANT_URL


class AvatarSettings:
    """Compatibility settings wrapper for extracted avatar services."""

    def __init__(self):
        self.QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
        self.QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
        self.QDRANT_URL = os.getenv("QDRANT_URL") or CORE_QDRANT_URL
        self.QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or CORE_QDRANT_API_KEY
        self.QDRANT_MODE = os.getenv("QDRANT_MODE", "server" if self.QDRANT_URL else "local")
        self.QDRANT_PATH = os.getenv("QDRANT_PATH", "qdrant_storage")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY") or CORE_GROQ_API_KEY

        # Avatar collections are intentionally prefixed to avoid collisions with existing project collections.
        self.AVATAR_FACES_COLLECTION = os.getenv("AVATAR_FACES_COLLECTION", "lifelens_avatar_faces")
        self.AVATAR_OBJECTS_COLLECTION = os.getenv("AVATAR_OBJECTS_COLLECTION", "lifelens_avatar_objects")
        self.AVATAR_PATIENTS_COLLECTION = os.getenv("AVATAR_PATIENTS_COLLECTION", "lifelens_avatar_patients")
        self.AVATAR_KNOWLEDGE_COLLECTION = os.getenv("AVATAR_KNOWLEDGE_COLLECTION", "lifelens_avatar_text_knowledge")

        # Optional model/runtime overrides.
        self.YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "").strip() or None

        # Voice clone extension point.
        # Supported providers:
        # - "sample" (default): return stored familiar voice sample
        # - "http": call AVATAR_VOICE_CLONE_ENDPOINT and fallback to stored sample on error
        self.AVATAR_VOICE_CLONE_PROVIDER = os.getenv("AVATAR_VOICE_CLONE_PROVIDER", "sample").strip().lower()
        self.AVATAR_VOICE_CLONE_ENDPOINT = os.getenv("AVATAR_VOICE_CLONE_ENDPOINT", "").strip() or None
        self.AVATAR_VOICE_CLONE_TIMEOUT_MS = int(os.getenv("AVATAR_VOICE_CLONE_TIMEOUT_MS", "8000"))

    def get_qdrant_url(self) -> str:
        if self.QDRANT_URL:
            return self.QDRANT_URL
        return f"http://{self.QDRANT_HOST}:{self.QDRANT_PORT}"


settings = AvatarSettings()
