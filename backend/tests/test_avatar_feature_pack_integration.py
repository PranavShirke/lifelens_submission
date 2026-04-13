from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from lifelens.api import avatar_routes


@dataclass
class FakePoint:
    score: float
    payload: Dict[str, Any]


class FakeMemoryService:
    def __init__(self):
        self.face_records: List[Dict[str, Any]] = []
        self.object_records: List[Dict[str, Any]] = []
        self.text_records: List[Dict[str, Any]] = []

    def store_face_memory(self, person_id: str, embedding: list, metadata: dict):
        self.face_records.append({"person_id": person_id, "embedding": embedding, "metadata": metadata})
        self.text_records.append(metadata)
        return "face-1"

    def store_patient_memory(self, person_id: str, embedding: list, metadata: dict):
        self.face_records.append({"person_id": person_id, "embedding": embedding, "metadata": metadata})
        self.text_records.append(metadata)
        return "patient-1"

    def search_face(self, embedding: list, limit: int = 1):
        if not self.face_records:
            return []
        latest = self.face_records[-1]["metadata"]
        payload = {"person_id": self.face_records[-1]["person_id"], **latest}
        return [FakePoint(score=0.92, payload=payload)]

    def store_object_memory(self, object_id: str, embedding: list, metadata: dict):
        self.object_records.append({"object_id": object_id, "embedding": embedding, "metadata": metadata})
        return "object-1"

    def search_object(self, embedding: list, limit: int = 1):
        if not self.object_records:
            return []
        latest = self.object_records[-1]["metadata"]
        return [FakePoint(score=0.95, payload=latest)]

    def search_by_text(self, text_query: str):
        text_lower = text_query.lower()
        matches: list[FakePoint] = []
        for payload in self.text_records:
            name = str(payload.get("name", "")).lower()
            if not name:
                continue
            if name in text_lower or text_lower in name:
                matches.append(FakePoint(score=0.9, payload=payload))
        return matches or [FakePoint(score=0.85, payload=self.text_records[-1])] if self.text_records else []


class FakeFaceService:
    def generate_embedding(self, image_path: str):
        return [0.1] * 512


class FakeObjectService:
    native_embedding_enabled = True

    def generate_embedding(self, image_path: str):
        return [0.2] * 1280

    def detect_objects(self, image_path: str):
        return []


class FakeAvatarService:
    def generate_avatar(self, image_path: str):
        return "https://example.com/avatar.png"


class FakeConversationService:
    def __init__(self):
        self.context: Dict[str, Any] = {}

    def update_context(self, person_data: dict):
        self.context = person_data

    def get_context(self):
        return self.context


class FakeSemanticMemoryService:
    def learn_person(self, person_data: dict):
        return None

    def search_knowledge(self, query: str, context_name: str | None = None):
        return []


class FakeLlmService:
    def generate_response(self, user_text: str, context: dict | None = None):
        if context and context.get("name"):
            return f"This is {context['name']}."
        return "I can help with memory search."


class FakeVoicePlaybackService:
    def clone_enabled(self) -> bool:
        return False

    def resolve_audio(self, text: str, person_payload: Dict[str, Any]):
        return person_payload.get("audio_base64"), "stored_sample"


def _image_bytes() -> bytes:
    image = Image.new("RGB", (48, 48), (140, 120, 100))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _audio_bytes() -> bytes:
    return b"RIFF\x24\x00\x00\x00WAVEfmt "


def _make_client(monkeypatch) -> tuple[TestClient, FakeMemoryService]:
    memory_service = FakeMemoryService()

    monkeypatch.setattr(avatar_routes, "_memory_service", lambda: memory_service)
    monkeypatch.setattr(avatar_routes, "_face_service", lambda: FakeFaceService())
    monkeypatch.setattr(avatar_routes, "_object_service", lambda: FakeObjectService())
    monkeypatch.setattr(avatar_routes, "_avatar_service", lambda: FakeAvatarService())
    monkeypatch.setattr(avatar_routes, "_conversation_service", lambda: FakeConversationService())
    monkeypatch.setattr(avatar_routes, "_semantic_memory_service", lambda: FakeSemanticMemoryService())
    monkeypatch.setattr(avatar_routes, "_llm_service", lambda: FakeLlmService())
    monkeypatch.setattr(avatar_routes, "_voice_playback_service", lambda: FakeVoicePlaybackService())

    app = FastAPI()
    app.include_router(avatar_routes.router)
    app.include_router(avatar_routes.v1_router)
    app.dependency_overrides[avatar_routes.verify_token] = lambda: {"sub": "tester", "role": "caretaker"}

    return TestClient(app), memory_service


def test_v1_remember_person_stores_relation_tags_and_audio(monkeypatch):
    client, memory_service = _make_client(monkeypatch)

    files = {
        "file": ("person.jpg", _image_bytes(), "image/jpeg"),
        "audio_file": ("voice.webm", _audio_bytes(), "audio/webm"),
    }
    data = {
        "name": "Suman Naik",
        "relation": "Family",
        "relation_tags": "Family,Emergency Contact,Trusted",
        "notes": "Usually visits in the evenings.",
    }

    response = client.post("/api/v1/remember/person", files=files, data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "stored"
    assert payload["name"] == "Suman Naik"

    stored = memory_service.face_records[-1]["metadata"]
    assert stored["relation"] == "Family"
    assert stored["relation_tags"] == ["Family", "Emergency Contact", "Trusted"]
    assert isinstance(stored.get("audio_base64"), str)
    assert stored["audio_base64"]


def test_v1_recognize_person_returns_relation_tags(monkeypatch):
    client, memory_service = _make_client(monkeypatch)

    memory_service.store_face_memory(
        person_id="suman_naik",
        embedding=[0.1] * 512,
        metadata={
            "name": "Suman Naik",
            "relation": "Family",
            "relation_tags": ["Family", "Trusted"],
            "notes": "Primary caregiver.",
            "audio_base64": "dGVzdF92b2ljZQ==",
        },
    )

    response = client.post(
        "/api/v1/recognize/person",
        files={"file": ("capture.jpg", _image_bytes(), "image/jpeg")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "identified"
    assert payload["person"]["name"] == "Suman Naik"
    assert payload["person"]["relation_tags"] == ["Family", "Trusted"]
    assert payload["person"]["audio"] == "dGVzdF92b2ljZQ=="


def test_v1_object_remember_and_find_flow(monkeypatch):
    client, _ = _make_client(monkeypatch)

    store_response = client.post(
        "/api/v1/remember/object",
        files={"file": ("pillbox.jpg", _image_bytes(), "image/jpeg")},
        data={"name": "Medicine Box", "notes": "Kept on bedroom table."},
    )
    assert store_response.status_code == 200
    assert store_response.json()["status"] == "stored"

    find_response = client.post(
        "/api/v1/find/object",
        files={"file": ("query.jpg", _image_bytes(), "image/jpeg")},
    )
    assert find_response.status_code == 200
    payload = find_response.json()
    assert payload["status"] == "identified"
    assert payload["object"]["name"] == "Medicine Box"


def test_v1_chat_voice_fallback_returns_stored_sample(monkeypatch):
    client, memory_service = _make_client(monkeypatch)

    memory_service.text_records.append(
        {
            "name": "Suman Naik",
            "relation": "Family",
            "notes": "Primary caregiver.",
            "audio_base64": "dGVzdF92b2ljZQ==",
            "image_base64": "data:image/jpeg;base64,abcd",
        }
    )

    response = client.post("/api/v1/chat/query", json={"text": "Can I hear Suman Naik voice?"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "found"
    assert payload["audio_base64"] == "dGVzdF92b2ljZQ=="
    assert payload["voice_source"] == "stored_sample"
    assert payload["voice_clone_enabled"] is False
