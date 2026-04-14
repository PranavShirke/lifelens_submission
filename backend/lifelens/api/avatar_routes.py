from __future__ import annotations

import base64
import io
import jwt
import shutil
import uuid
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, File, Form, Header, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel

from lifelens.config import JWT_ALGORITHM, JWT_SECRET

router = APIRouter(prefix="/api/avatar", tags=["avatar"])
v1_router = APIRouter(prefix="/api/v1", tags=["avatar"])

TEMP_DIR = Path("temp_uploads")
ENROLL_DIR = Path("photo/enrolled")
AUDIO_DIR = Path("audio/enrolled")

TEMP_DIR.mkdir(parents=True, exist_ok=True)
ENROLL_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


class AvatarChatRequest(BaseModel):
    text: str


def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Token") from exc


@lru_cache(maxsize=1)
def _memory_service():
    from lifelens.avatar.memory_service import memory_service

    return memory_service


@lru_cache(maxsize=1)
def _conversation_service():
    from lifelens.avatar.conversation_service import conversation_service

    return conversation_service


@lru_cache(maxsize=1)
def _llm_service():
    from lifelens.avatar.llm_service import llm_service

    return llm_service


@lru_cache(maxsize=1)
def _semantic_memory_service():
    from lifelens.avatar.semantic_memory import semantic_memory

    return semantic_memory


@lru_cache(maxsize=1)
def _face_service():
    from lifelens.avatar.face_service import face_service

    return face_service


@lru_cache(maxsize=1)
def _object_service():
    from lifelens.avatar.object_service import detector

    return detector


@lru_cache(maxsize=1)
def _avatar_service():
    from lifelens.avatar.avatar_service import avatar_service

    return avatar_service


@lru_cache(maxsize=1)
def _voice_playback_service():
    from lifelens.avatar.voice_playback import voice_playback_service

    return voice_playback_service


def _make_temp_path(filename: str) -> Path:
    suffix = Path(filename).suffix or ".jpg"
    return TEMP_DIR / f"{uuid.uuid4()}{suffix}"


def _encode_image_base64(image_path: str) -> Optional[str]:
    try:
        with Image.open(image_path) as image:
            image.thumbnail((300, 300))
            buffer = io.BytesIO()
            image.convert("RGB").save(buffer, format="JPEG", quality=70)
            encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/jpeg;base64,{encoded}"
    except Exception:
        return None


async def _save_upload(file: UploadFile, destination: Path):
    with open(destination, "wb") as output:
        shutil.copyfileobj(file.file, output)


async def _encode_audio_base64(audio_file: Optional[UploadFile], base_name: str) -> Optional[str]:
    if not audio_file:
        return None

    ext = Path(audio_file.filename or "sample.webm").suffix or ".webm"
    audio_path = AUDIO_DIR / f"{base_name}_{uuid.uuid4()}{ext}"

    with open(audio_path, "wb") as output:
        shutil.copyfileobj(audio_file.file, output)

    with open(audio_path, "rb") as source:
        return base64.b64encode(source.read()).decode("utf-8")


def _dependency_error(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=503,
        detail=f"Avatar dependency is unavailable: {exc}",
    )


def _parse_relation_tags(raw_tags: Optional[str], relation: str) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()

    if raw_tags:
        for token in raw_tags.split(","):
            cleaned = token.strip()
            lowered = cleaned.lower()
            if cleaned and lowered not in seen:
                tags.append(cleaned)
                seen.add(lowered)

    relation_cleaned = relation.strip()
    relation_lowered = relation_cleaned.lower()
    if relation_cleaned and relation_lowered not in seen:
        tags.append(relation_cleaned)

    return tags


@router.post("/recognize/person")
@v1_router.post("/recognize/person")
async def recognize_person(file: UploadFile = File(...), _: dict = Depends(verify_token)):
    temp_path = _make_temp_path(file.filename or "capture.jpg")

    try:
        await _save_upload(file, temp_path)

        try:
            face_service = _face_service()
            memory_service = _memory_service()
        except Exception as exc:
            raise _dependency_error(exc)

        # Generate embeddings for ALL detected faces in the frame
        all_embeddings = face_service.generate_all_embeddings(str(temp_path))
        
        # Fallback to single embedding if multi-face method is not available
        if not all_embeddings:
            single = face_service.generate_embedding(str(temp_path))
            if single:
                all_embeddings = [single]

        if not all_embeddings:
            return {"status": "no_face_detected", "person": None}

        # Search for the best match across ALL detected faces
        best_match = None
        best_score = 0.0
        
        for emb in all_embeddings:
            matches = memory_service.search_face(emb)
            if matches and matches[0].score > best_score:
                best_match = matches[0]
                best_score = matches[0].score

        # Threshold reverted to 0.88 to ensure the face is recognized as originally requested, accepting background false-positives under the fallback framework.
        if best_match and best_score > 0.88:
            payload = best_match.payload or {}
            _conversation_service().update_context(payload)
            return {
                "status": "identified",
                "person": {
                    "name": payload.get("name", "Unknown"),
                    "relation": payload.get("relation", "Unknown"),
                    "confidence": best_score,
                    "id": payload.get("person_id"),
                    "notes": payload.get("notes", ""),
                    "relation_tags": payload.get("relation_tags", []),
                    "image": payload.get("image_base64"),
                    "audio": payload.get("audio_base64"),
                },
            }

        return {"status": "unknown", "person": None}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Person recognition failed: {exc}") from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()



@router.post("/remember/person")
@v1_router.post("/remember/person")
async def remember_person(
    name: str = Form(...),
    relation: str = Form("Acquaintance"),
    relation_tags: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    file: UploadFile = File(...),
    audio_file: Optional[UploadFile] = File(None),
    _: dict = Depends(verify_token),
):
    filename = f"{name.replace(' ', '_')}_{uuid.uuid4()}.jpg"
    image_path = ENROLL_DIR / filename

    try:
        await _save_upload(file, image_path)

        try:
            face_service = _face_service()
            memory_service = _memory_service()
            avatar_service = _avatar_service()
        except Exception as exc:
            raise _dependency_error(exc)

        embedding = face_service.generate_embedding(str(image_path))
        if not embedding:
            if image_path.exists():
                image_path.unlink()
            return {"status": "error", "message": "No face detected in enrollment photo."}

        audio_b64 = await _encode_audio_base64(audio_file, name.replace(" ", "_"))
        image_b64 = _encode_image_base64(str(image_path))
        avatar_url = avatar_service.generate_avatar(str(image_path))
        parsed_relation_tags = _parse_relation_tags(relation_tags, relation)

        metadata: Dict[str, Any] = {
            "name": name,
            "relation": relation,
            "relation_tags": parsed_relation_tags,
            "age": age,
            "type": "person",
            "notes": notes or f"This is {name}, your {relation}.",
            "image_base64": image_b64,
            "avatar_url": avatar_url,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if audio_b64:
            metadata["audio_base64"] = audio_b64

        memory_service.store_face_memory(
            person_id=name.replace(" ", "_"),
            embedding=embedding,
            metadata=metadata,
        )

        try:
            _semantic_memory_service().learn_person(metadata)
        except Exception:
            pass

        _conversation_service().update_context(metadata)
        return {"status": "stored", "name": name, "avatar_url": avatar_url}
    except HTTPException:
        raise
    except Exception as exc:
        if image_path.exists():
            image_path.unlink()
        raise HTTPException(status_code=500, detail=f"Person enrollment failed: {exc}") from exc


@router.post("/remember/patient")
@v1_router.post("/remember/patient")
async def remember_patient(
    name: str = Form(...),
    relation: str = Form("Acquaintance"),
    relation_tags: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    file: UploadFile = File(...),
    audio_file: Optional[UploadFile] = File(None),
    _: dict = Depends(verify_token),
):
    filename = f"{name.replace(' ', '_')}_{uuid.uuid4()}.jpg"
    image_path = ENROLL_DIR / filename

    try:
        await _save_upload(file, image_path)

        try:
            face_service = _face_service()
            memory_service = _memory_service()
            avatar_service = _avatar_service()
        except Exception as exc:
            raise _dependency_error(exc)

        embedding = face_service.generate_embedding(str(image_path))
        if not embedding:
            if image_path.exists():
                image_path.unlink()
            return {"status": "error", "message": "No face detected in enrollment photo."}

        audio_b64 = await _encode_audio_base64(audio_file, name.replace(" ", "_"))
        image_b64 = _encode_image_base64(str(image_path))
        avatar_url = avatar_service.generate_avatar(str(image_path))
        parsed_relation_tags = _parse_relation_tags(relation_tags, relation)

        metadata: Dict[str, Any] = {
            "name": name,
            "relation": relation,
            "relation_tags": parsed_relation_tags,
            "age": age,
            "type": "patient_contact",
            "notes": notes or f"This is {name}, your {relation}.",
            "image_base64": image_b64,
            "avatar_url": avatar_url,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if audio_b64:
            metadata["audio_base64"] = audio_b64

        memory_service.store_patient_memory(
            person_id=name.replace(" ", "_"),
            embedding=embedding,
            metadata=metadata,
        )

        try:
            _semantic_memory_service().learn_person(metadata)
        except Exception:
            pass

        _conversation_service().update_context(metadata)
        return {"status": "stored", "name": name, "avatar_url": avatar_url}
    except HTTPException:
        raise
    except Exception as exc:
        if image_path.exists():
            image_path.unlink()
        raise HTTPException(status_code=500, detail=f"Patient enrollment failed: {exc}") from exc


@router.post("/remember/object")
@v1_router.post("/remember/object")
async def remember_object(
    name: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    _: dict = Depends(verify_token),
):
    temp_path = _make_temp_path(file.filename or "object.jpg")

    try:
        await _save_upload(file, temp_path)

        try:
            object_service = _object_service()
            memory_service = _memory_service()
        except Exception as exc:
            raise _dependency_error(exc)

        embedding = object_service.generate_embedding(str(temp_path))
        image_b64 = _encode_image_base64(str(temp_path))

        metadata = {
            "name": name,
            "type": "object",
            "notes": notes or f"This is your {name}.",
            "image_base64": image_b64,
            "timestamp": datetime.utcnow().isoformat(),
        }

        memory_service.store_object_memory(
            object_id=str(uuid.uuid4()),
            embedding=embedding,
            metadata=metadata,
        )

        _conversation_service().update_context(metadata)
        return {"status": "stored", "name": name}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Object enrollment failed: {exc}") from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.post("/find/object")
@v1_router.post("/find/object")
async def find_object(file: UploadFile = File(...), _: dict = Depends(verify_token)):
    temp_path = _make_temp_path(file.filename or "capture.jpg")

    try:
        await _save_upload(file, temp_path)

        try:
            object_service = _object_service()
            memory_service = _memory_service()
        except Exception as exc:
            raise _dependency_error(exc)

        embedding = object_service.generate_embedding(str(temp_path))
        matches = memory_service.search_object(embedding)

        match_threshold = 0.85
        if not getattr(object_service, "native_embedding_enabled", True):
            match_threshold = 0.88

        if matches and matches[0].score > match_threshold:
            best = matches[0]
            payload = best.payload or {}
            _conversation_service().update_context(payload)
            return {
                "status": "identified",
                "object": {
                    "name": payload.get("name", "Unknown"),
                    "notes": payload.get("notes", ""),
                    "confidence": best.score,
                    "location": payload.get("location", "Unknown"),
                    "image": payload.get("image_base64"),
                },
            }

        detections = object_service.detect_objects(str(temp_path))
        if detections:
            best_detection = max(detections, key=lambda item: item["confidence"])
            label = best_detection["object"]
            timestamp = datetime.now().strftime("%I:%M %p")
            location = f"last seen around {timestamp}"
            image_b64 = _encode_image_base64(str(temp_path))

            metadata = {
                "name": label,
                "type": "object",
                "notes": "Auto-enrolled from camera observation.",
                "location": location,
                "image_base64": image_b64,
                "timestamp": datetime.utcnow().isoformat(),
            }

            memory_service.store_object_memory(
                object_id=str(uuid.uuid4()),
                embedding=embedding,
                metadata=metadata,
            )

            _conversation_service().update_context(metadata)
            return {
                "status": "identified",
                "object": {
                    "name": label,
                    "notes": "I just learned this object from your camera input.",
                    "confidence": best_detection["confidence"],
                    "location": location,
                    "image": image_b64,
                },
            }

        return {"status": "unknown", "object": None}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Object scan failed: {exc}") from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.post("/chat/query")
@v1_router.post("/chat/query")
async def chat_query(payload: AvatarChatRequest = Body(...), _: dict = Depends(verify_token)):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text query is required")

    lower_text = text.lower()

    try:
        conversation_service = _conversation_service()
        memory_service = _memory_service()
        llm_service = _llm_service()
    except Exception as exc:
        raise _dependency_error(exc)

    try:
        semantic_memory = _semantic_memory_service()
    except Exception:
        semantic_memory = None

    context = conversation_service.get_context() or {}
    context_name = context.get("name") if isinstance(context, dict) else None

    pronouns = {"he", "she", "him", "her", "it", "his", "live", "do", "does", "about", "look", "features"}
    is_followup = any(token in pronouns for token in lower_text.split())

    if is_followup and not context_name and "who is" not in lower_text:
        return {
            "status": "unknown",
            "text": "I'm not sure who you are referring to. Who are we talking about?",
        }

    matches: list[dict[str, Any]] = []
    entity_matches = memory_service.search_by_text(text)

    if entity_matches:
        top_payload = entity_matches[0].payload or {}
        response_text = llm_service.generate_response(user_text=text, context=top_payload)
        matches = [{"name": top_payload.get("name"), "text": response_text, "payload": top_payload}]
    elif semantic_memory:
        if context_name and is_followup and "who is" not in lower_text:
            matches = semantic_memory.search_knowledge(text, context_name=context_name)
        else:
            matches = semantic_memory.search_knowledge(text)

    if not matches:
        return {
            "status": "unknown",
            "text": "I couldn't find anything relevant in memory right now.",
        }

    best_match = matches[0]
    name = best_match.get("name")

    full_person = None
    original_matches = []
    audio_base64 = None
    image_base64 = None

    if name:
        original_matches = memory_service.search_by_text(name)
        if original_matches:
            full_person = original_matches[0].payload or {}
            for match in original_matches:
                payload_data = match.payload or {}
                if not audio_base64 and payload_data.get("audio_base64"):
                    audio_base64 = payload_data.get("audio_base64")
                if not image_base64 and payload_data.get("image_base64"):
                    image_base64 = payload_data.get("image_base64")

    if not full_person:
        full_person = best_match.get("payload") if isinstance(best_match.get("payload"), dict) else best_match

    if isinstance(full_person, dict):
        if not audio_base64:
            audio_base64 = full_person.get("audio_base64")
        if not image_base64:
            image_base64 = full_person.get("image_base64")

    if isinstance(full_person, dict):
        conversation_service.update_context(full_person)

    llm_context: Dict[str, Any] = dict(full_person) if isinstance(full_person, dict) else {}
    llm_context["has_audio"] = bool(audio_base64)
    llm_context["has_image"] = bool(image_base64)

    final_text = llm_service.generate_response(user_text=text, context=llm_context)

    gallery: list[str] = []
    if original_matches:
        seen = set()
        for match in original_matches:
            payload_data = match.payload or {}
            image = payload_data.get("image_base64")
            if image and image not in seen and len(image) > 100:
                gallery.append(image)
                seen.add(image)
        gallery = gallery[:6]

    voice_keywords = {"voice", "talk", "speak", "sound", "listen", "hear"}
    gallery_keywords = {"memories", "photos", "pictures", "images", "gallery", "album", "see", "look"}
    voice_intent = any(keyword in lower_text for keyword in voice_keywords)
    gallery_intent = any(keyword in lower_text for keyword in gallery_keywords)

    voice_audio = audio_base64
    voice_source = "stored_sample" if audio_base64 else "none"
    voice_clone_enabled = False

    if voice_intent and isinstance(full_person, dict):
        try:
            voice_service = _voice_playback_service()
            voice_clone_enabled = voice_service.clone_enabled()
            voice_audio, voice_source = voice_service.resolve_audio(text=text, person_payload=full_person)
        except Exception:
            voice_audio = audio_base64
            voice_source = "stored_sample" if audio_base64 else "none"

    return {
        "status": "found",
        "text": final_text,
        "person": full_person if isinstance(full_person, dict) else best_match,
        "audio_base64": voice_audio if voice_intent else None,
        "voice_source": voice_source if voice_intent else None,
        "voice_clone_enabled": voice_clone_enabled,
        "image_base64": image_base64,
        "gallery": gallery if gallery_intent else [],
    }


@router.get("/enrollment/{patient_id}")
@v1_router.get("/enrollment/{patient_id}")
async def get_enrollment_records(patient_id: str, _: dict = Depends(verify_token)):
    """Get all enrolled people and objects from the unified avatar collections."""
    try:
        memory_service = _memory_service()
    except Exception as exc:
        raise _dependency_error(exc)

    records = []

    # Fetch all enrolled faces
    try:
        face_points = memory_service.client.scroll(
            collection_name=memory_service.faces_collection,
            limit=500,
            with_payload=True,
            with_vectors=False,
        )[0]

        for point in face_points:
            payload = point.payload or {}
            records.append({
                "id": str(point.id),
                "patient_id": patient_id,
                "name": payload.get("name", "Unknown"),
                "enrollment_type": "person",
                "relation": payload.get("relation"),
                "age": payload.get("age"),
                "notes": payload.get("notes"),
                "relationship_tags": payload.get("relation_tags", []),
                "image_base64": payload.get("image_base64"),
                "audio_base64": payload.get("audio_base64"),
                "timestamp": payload.get("timestamp", ""),
            })
    except Exception:
        pass

    # Fetch all enrolled patients (caregiver-enrolled contacts)
    try:
        patient_points = memory_service.client.scroll(
            collection_name=memory_service.patients_collection,
            limit=500,
            with_payload=True,
            with_vectors=False,
        )[0]

        for point in patient_points:
            payload = point.payload or {}
            records.append({
                "id": str(point.id),
                "patient_id": patient_id,
                "name": payload.get("name", "Unknown"),
                "enrollment_type": "person",
                "relation": payload.get("relation"),
                "age": payload.get("age"),
                "notes": payload.get("notes"),
                "relationship_tags": payload.get("relation_tags", []),
                "image_base64": payload.get("image_base64"),
                "audio_base64": payload.get("audio_base64"),
                "timestamp": payload.get("timestamp", ""),
            })
    except Exception:
        pass

    # Fetch all enrolled objects
    try:
        object_points = memory_service.client.scroll(
            collection_name=memory_service.objects_collection,
            limit=500,
            with_payload=True,
            with_vectors=False,
        )[0]

        for point in object_points:
            payload = point.payload or {}
            records.append({
                "id": str(point.id),
                "patient_id": patient_id,
                "name": payload.get("name", "Unknown"),
                "enrollment_type": "object",
                "notes": payload.get("notes"),
                "image_base64": payload.get("image_base64"),
                "timestamp": payload.get("timestamp", ""),
            })
    except Exception:
        pass

    # Sort by timestamp descending
    records.sort(key=lambda r: r.get("timestamp", ""), reverse=True)

    return {"records": records}

