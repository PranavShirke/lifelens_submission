from __future__ import annotations

import logging
from typing import Dict, Set

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams

from lifelens.avatar.config import settings

logger = logging.getLogger(__name__)

# Collections already present in user's cloud instance that must never be overwritten.
PROTECTED_COLLECTION_NAMES: Set[str] = {
    "medications",
    "mood_alerts",
    "mood_events",
    "mood_feedback",
    "agent_decisions",
    "lifelens_memory",
    "lifelens_users",
    "medication_events",
    "medication_insights",
}


def _create_client() -> QdrantClient:
    if settings.QDRANT_MODE == "local":
        return QdrantClient(path=settings.QDRANT_PATH)
    return QdrantClient(url=settings.get_qdrant_url(), api_key=settings.QDRANT_API_KEY)


def _resolve_collection_name(base_name: str, existing_names: Set[str]) -> str:
    if base_name not in PROTECTED_COLLECTION_NAMES:
        return base_name

    preferred = f"{base_name}_avatar"
    if preferred in existing_names:
        return preferred
    if preferred not in PROTECTED_COLLECTION_NAMES:
        return preferred

    idx = 2
    while True:
        candidate = f"{base_name}_avatar_{idx}"
        if candidate not in existing_names and candidate not in PROTECTED_COLLECTION_NAMES:
            return candidate
        if candidate in existing_names:
            return candidate
        idx += 1


def ensure_avatar_collections() -> Dict[str, str]:
    """
    Ensure all avatar-specific collections exist without touching protected collections.
    Returns the resolved collection names that should be used by runtime services.
    """
    client = _create_client()

    existing = client.get_collections()
    existing_names: Set[str] = {entry.name for entry in existing.collections}

    resolved = {
        "faces": _resolve_collection_name(settings.AVATAR_FACES_COLLECTION, existing_names),
        "objects": _resolve_collection_name(settings.AVATAR_OBJECTS_COLLECTION, existing_names),
        "patients": _resolve_collection_name(settings.AVATAR_PATIENTS_COLLECTION, existing_names),
        "knowledge": _resolve_collection_name(settings.AVATAR_KNOWLEDGE_COLLECTION, existing_names),
    }

    # Propagate resolved names for the rest of the process.
    settings.AVATAR_FACES_COLLECTION = resolved["faces"]
    settings.AVATAR_OBJECTS_COLLECTION = resolved["objects"]
    settings.AVATAR_PATIENTS_COLLECTION = resolved["patients"]
    settings.AVATAR_KNOWLEDGE_COLLECTION = resolved["knowledge"]

    collection_specs = [
        (resolved["faces"], 512),
        (resolved["objects"], 1280),
        (resolved["patients"], 512),
        (resolved["knowledge"], 384),
    ]

    for collection_name, vector_size in collection_specs:
        if collection_name in existing_names:
            continue

        logger.info("Creating avatar collection '%s'", collection_name)
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        existing_names.add(collection_name)

    # Helpful payload index for semantic-memory filtering.
    try:
        client.create_payload_index(
            collection_name=resolved["knowledge"],
            field_name="name",
            field_schema=PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass

    return resolved
