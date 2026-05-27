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


def _save_upload(file: UploadFile, destination: Path):
    with open(destination, "wb") as output:
        shutil.copyfileobj(file.file, output)


def _encode_audio_base64(audio_file: Optional[UploadFile], base_name: str) -> Optional[str]:
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
def recognize_person(file: UploadFile = File(...), _: dict = Depends(verify_token)):
    temp_path = _make_temp_path(file.filename or "capture.jpg")

    try:
        _save_upload(file, temp_path)

        try:
            face_service = _face_service()
            memory_service = _memory_service()
        except Exception as exc:
            raise _dependency_error(exc)

        # --- DeepFace recognition (zero manual math) -----------------------
        # DeepFace.find() handles face detection, embedding, distance
        # calculation, and threshold enforcement internally.
        # Returns None if: no face detected OR no match found.
        result = face_service.recognize_from_image(str(temp_path))

        if result is None:
            # Check if a face was detected at all (for better UX messaging)
            has_face = face_service.has_face(str(temp_path))
            if not has_face:
                return {"status": "no_face_detected", "person": None}
            else:
                return {"status": "unknown", "person": None}

        # Match found — look up full metadata from Qdrant for rich response
        matched_name = result["name"]
        confidence = result.get("confidence", 0.0)

        # Search Qdrant by exact person_id to get the full person payload (notes, audio, etc.)
        # We don't use fuzzy search here because "Pranav Shirke" and "Pragati Shirke" 
        # look too similar to the fuzzy matcher.
        person_record = memory_service.get_person_by_id(matched_name)
        if person_record:
            payload = person_record.payload or {}
            _conversation_service().update_context(payload)
            return {
                "status": "identified",
                "person": {
                    "name": payload.get("name", matched_name),
                    "relation": payload.get("relation", "Unknown"),
                    "confidence": confidence,
                    "id": payload.get("person_id"),
                    "notes": payload.get("notes", ""),
                    "relation_tags": payload.get("relation_tags", []),
                    "image": payload.get("image_base64"),
                    "audio": payload.get("audio_base64"),
                },
            }

        # DeepFace matched but no Qdrant record (edge case)
        return {
            "status": "identified",
            "person": {
                "name": matched_name,
                "relation": "Unknown",
                "confidence": confidence,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Person recognition failed: {exc}") from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()



@router.post("/remember/person")
@v1_router.post("/remember/person")
def remember_person(
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
        _save_upload(file, image_path)

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

        audio_b64 = _encode_audio_base64(audio_file, name.replace(" ", "_"))
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

        # Dual-write: also save to known_faces/ for DeepFace recognition
        face_service.enroll_face_image(name, str(image_path))

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
def remember_patient(
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
        _save_upload(file, image_path)

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

        audio_b64 = _encode_audio_base64(audio_file, name.replace(" ", "_"))
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

        # Dual-write: also save to known_faces/ for DeepFace recognition
        face_service.enroll_face_image(name, str(image_path))

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
def remember_object(
    name: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    _: dict = Depends(verify_token),
):
    temp_path = _make_temp_path(file.filename or "object.jpg")

    try:
        _save_upload(file, temp_path)

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
def find_object(file: UploadFile = File(...), _: dict = Depends(verify_token)):
    temp_path = _make_temp_path(file.filename or "capture.jpg")

    try:
        _save_upload(file, temp_path)

        try:
            object_service = _object_service()
            memory_service = _memory_service()
        except Exception as exc:
            raise _dependency_error(exc)

        # 1. First, search by visual embedding
        embedding = object_service.generate_embedding(str(temp_path))
        matches = memory_service.search_object(embedding)
        
        if matches and matches[0].score > 0.6:
            best = matches[0]
            enrolled_obj = best.payload or {}
            
            _conversation_service().update_context(enrolled_obj)
            return {
                "status": "identified",
                "object": {
                    "name": enrolled_obj.get("name", "Unknown"),
                    "notes": enrolled_obj.get("notes", ""),
                    "confidence": float(best.score),
                    "location": enrolled_obj.get("location", "Unknown"),
                    "image": enrolled_obj.get("image_base64"),
                },
            }

        # 2. Fallback: YOLO detection with strict confidence (conf=0.65)
        # This acts as a fallback for objects that YOLO natively knows
        # and eliminates false positives.
        detections = object_service.detect_objects(str(temp_path))

        # Filter out generic human-body YOLO classes — these are always
        # redundant with face recognition and produce confusing HUD boxes
        # like "DETECTED: PERSON (NOT ENROLLED)".
        _IGNORED_YOLO_CLASSES = {"person"}
        detections = [d for d in detections if d["object"].lower() not in _IGNORED_YOLO_CLASSES]

        if detections:
            best_detection = max(detections, key=lambda item: item["confidence"])
            label = best_detection["object"]
            confidence = best_detection["confidence"]

            # Check if this YOLO label matches any enrolled custom object
            enrolled_records = memory_service.search_by_text(label)
            enrolled_obj = None
            for record in (enrolled_records or []):
                payload = record.payload or {}
                if payload.get("type") == "object":
                    enrolled_obj = payload
                    break

            if enrolled_obj:
                _conversation_service().update_context(enrolled_obj)
                return {
                    "status": "identified",
                    "object": {
                        "name": enrolled_obj.get("name", label),
                        "notes": enrolled_obj.get("notes", ""),
                        "confidence": confidence,
                        "location": enrolled_obj.get("location", "Unknown"),
                        "image": enrolled_obj.get("image_base64"),
                    },
                }

            # YOLO detected something but it's not enrolled
            return {
                "status": "unknown",
                "object": None,
                "suggestion": f"I detected a '{label}' but it hasn't been enrolled yet. Use 'Enroll Object' to remember it.",
                "detected_label": label,
                "detected_confidence": confidence,
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
def chat_query(payload: AvatarChatRequest = Body(...), _: dict = Depends(verify_token)):
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

    # ── NEW: If no avatar/semantic matches, search main patient memories + meds ──
    if not matches:
        extra_context_parts = []

        # Search main lifelens_memory collection for recent memories
        try:
            from qdrant_client import QdrantClient
            from lifelens.config import QDRANT_URL, QDRANT_API_KEY
            main_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

            from sentence_transformers import SentenceTransformer
            encoder = SentenceTransformer("all-MiniLM-L6-v2")
            query_vec = encoder.encode(text).tolist()

            mem_results = main_client.query_points(
                collection_name="lifelens_memory",
                query=query_vec,
                limit=5,
            )
            for pt in mem_results.points:
                p = pt.payload or {}
                content = p.get("content") or p.get("text") or p.get("notes") or ""
                if content:
                    extra_context_parts.append(content[:300])
        except Exception:
            pass

        # Fetch today's medication schedule
        try:
            from lifelens.agents.medication_scheduler import get_todays_medications
            from lifelens.config import QDRANT_URL as Q_URL, QDRANT_API_KEY as Q_KEY
            med_client = QdrantClient(url=Q_URL, api_key=Q_KEY)
            meds = get_todays_medications(med_client, "patient_1")
            if meds:
                med_lines = []
                for m in meds:
                    med_lines.append(f"{m['medication_name']} {m['dosage']} at {m['scheduled_time']} — {m['status']}")
                extra_context_parts.append("Today's Medications:\n" + "\n".join(med_lines))
        except Exception:
            pass

        # Use LLM with gathered context (even if empty — for general conversation)
        combined_context = {
            "name": "LifeLens Patient",
            "notes": "\n---\n".join(extra_context_parts) if extra_context_parts else "No specific data found for this query.",
            "has_audio": False,
            "has_image": False,
        }
        final_text = llm_service.generate_response(user_text=text, context=combined_context)
        return {
            "status": "found",
            "text": final_text,
            "person": None,
            "audio_base64": None,
            "voice_source": None,
            "voice_clone_enabled": False,
            "image_base64": None,
            "gallery": [],
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
def get_enrollment_records(patient_id: str, _: dict = Depends(verify_token)):
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

