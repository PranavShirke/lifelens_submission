"""
LifeLens FastAPI Backend
Complete API server for the React frontend.
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import sys
import jwt
import time
import logging
import uuid
import io
import base64
from datetime import datetime, timedelta
from PIL import Image

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from lifelens.config import QDRANT_COLLECTION_NAME, JWT_SECRET, JWT_ALGORITHM, VECTOR_SIZE
from lifelens.auth.users import authenticate, create_user, get_all_patients, initialize_default_users
from lifelens.qdrant.client import get_qdrant_client
from lifelens.qdrant.schema import (
    create_collection_if_not_exists,
    create_mood_collections_if_not_exist,
    create_medication_collections_if_not_exist,
    create_agent_decisions_collection_if_not_exist,
)
from lifelens.retrieval.search_engine import search_memories
from lifelens.retrieval.reasoning import get_answer
from lifelens.ingestion.upsert_memory import upsert_memory
from qdrant_client.http import models

# Initialize App
app = FastAPI(title="LifeLens API", description="Backend for React Frontend", version="2.0.0")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENROLLMENT_COLLECTION_NAME = "lifelens_enrollment"


def ensure_enrollment_collection(client):
    """Create enrollment collection and indexes if missing."""
    existing = [c.name for c in client.get_collections().collections]
    if ENROLLMENT_COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=ENROLLMENT_COLLECTION_NAME,
            vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
        )

    # Index creation is safe to re-run; ignore provider errors for existing indexes.
    for field_name in ["patient_id", "enrollment_type", "name", "timestamp"]:
        try:
            client.create_payload_index(
                collection_name=ENROLLMENT_COLLECTION_NAME,
                field_name=field_name,
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass


def purge_patient_enrollment_records(client):
    """Remove deprecated patient registration records from the enrollment collection."""
    try:
        if ENROLLMENT_COLLECTION_NAME not in [c.name for c in client.get_collections().collections]:
            return

        client.delete(
            collection_name=ENROLLMENT_COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(key="enrollment_type", match=models.MatchValue(value="patient"))]
                )
            ),
        )
    except Exception as e:
        logger.warning(f"Failed to purge patient enrollment records: {e}")


def _encode_image_upload(image_file: UploadFile) -> str:
    image_bytes = image_file.file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image.thumbnail((512, 512))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=75)
    return base64.b64encode(out.getvalue()).decode("utf-8")


def _encode_audio_upload(audio_file: UploadFile) -> str:
    audio_bytes = audio_file.file.read()
    return base64.b64encode(audio_bytes).decode("utf-8")


def _process_image_bytes(image_bytes: bytes) -> Dict[str, Any]:
    from lifelens.ingestion.image_processor import process_image

    image_file = io.BytesIO(image_bytes)
    image_file.name = "enrollment.jpg"
    return process_image(image_file, enable_quality_check=False)


def _process_audio_bytes(audio_bytes: bytes, filename: str = "voice.webm") -> Dict[str, Any]:
    from lifelens.ingestion.audio_processor import process_audio

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename
    return process_audio(audio_file)


def _build_relationship_tags(relation: str, notes: Optional[str], age: Optional[int]) -> List[str]:
    tags = []
    if relation:
        tags.append(relation.strip())
    if notes:
        tags.extend([word.strip().strip(",.;:") for word in notes.split()[:3] if len(word.strip()) > 2])
    if age is not None:
        tags.append(str(age))
    return [tag for tag in dict.fromkeys(tags) if tag]


def _check_enrollment_access(user: dict, patient_id: str):
    if user.get("role") != "caretaker":
        return

    patients = user.get("patients", [])
    allowed_patient_ids = set()
    for patient in patients:
        if isinstance(patient, str):
            allowed_patient_ids.add(patient)
        elif isinstance(patient, dict):
            pid = patient.get("patient_id") or patient.get("id")
            if pid:
                allowed_patient_ids.add(pid)

    if patient_id not in allowed_patient_ids:
        raise HTTPException(status_code=403, detail="Patient access denied")


# ==================== STARTUP ====================

@app.on_event("startup")
def on_startup():
    """Initialize DB collections and default users on startup."""
    try:
        initialize_default_users()
        client = get_qdrant_client()
        create_collection_if_not_exists(client)
        create_mood_collections_if_not_exist(client)
        create_medication_collections_if_not_exist(client)
        create_agent_decisions_collection_if_not_exist(client)
        ensure_enrollment_collection(client)
        purge_patient_enrollment_records(client)
        logger.info("✅ All collections initialized")
    except Exception as e:
        logger.error(f"Startup initialization failed: {e}")


# ==================== MODELS ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    fullName: str
    role: str
    patientId: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

class SearchRequest(BaseModel):
    query: str
    patient_id: str
    top_k: int = 5

class ChatRequest(BaseModel):
    question: str
    patient_id: str
    agentic_mode: bool = True

class MemoryCreate(BaseModel):
    content: str
    patient_id: str
    tags: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    location_text: Optional[str] = None
    location: Optional[Dict] = None
    is_milestone: bool = False

class MedicationCreate(BaseModel):
    patient_id: str
    name: str
    dosage: str
    frequency: str
    schedule: List[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    prescribed_by: Optional[str] = None

class DoseAction(BaseModel):
    patient_id: str
    medication_id: str
    status: str  # "taken" or "skipped"
    dose_time: str
    dose_date: Optional[str] = None
    note: Optional[str] = None
    reported_by: str = "patient"

class FamilyRequestCreate(BaseModel):
    patient_id: str
    requester_name: str
    memory_type: str
    description: str
    details: Optional[Dict] = None

class FamilyRequestUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class MessageCreate(BaseModel):
    patient_id: str
    author_name: str
    content: str


# ==================== DEPENDENCIES ====================

def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Token")


def get_client():
    """Get Qdrant client (reusable dependency)."""
    return get_qdrant_client()


# ==================== HEALTH ====================

@app.get("/")
def health_check():
    return {"status": "ok", "service": "LifeLens API", "version": "2.0.0"}


# ==================== AUTH ====================

@app.post("/api/auth/login", response_model=Token)
def login(request: LoginRequest):
    user = authenticate(request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user["role"] in ["caretaker", "family"]:
        from lifelens.auth.users import get_all_patients
        user["patients"] = get_all_patients()

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "patient_id": user.get("patient_id"),
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    if "patients" in user:
        payload["patients"] = user["patients"]

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "patient_id": user.get("patient_id", ""),
            "patients": user.get("patients", []),
        },
    }


@app.post("/api/auth/register")
def register(request: RegisterRequest):
    success, message = create_user(
        request.username, request.password, request.role, request.fullName, request.patientId
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)

    # Auto-login after register
    user = authenticate(request.username, request.password)
    if not user:
        raise HTTPException(status_code=500, detail="Registration succeeded but login failed")

    payload = {
        "sub": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
        "patient_id": user.get("patient_id"),
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_info": {
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "patient_id": user.get("patient_id", ""),
            "patients": user.get("patients", []),
        },
    }


@app.get("/api/auth/patients")
def list_patients(user: dict = Depends(verify_token)):
    patients = get_all_patients()
    return {"patients": patients}


# ==================== ENROLLMENT ====================

@app.post("/api/enrollment/person")
async def enroll_person(
    patient_id: str = Form(...),
    name: str = Form(...),
    relation: str = Form("Acquaintance"),
    notes: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    file: UploadFile = File(...),
    audio_file: Optional[UploadFile] = File(None),
    user: dict = Depends(verify_token),
):
    try:
        _check_enrollment_access(user, patient_id)
        client = get_client()
        ensure_enrollment_collection(client)

        image_bytes = await file.read()
        image_result = _process_image_bytes(image_bytes)
        image_b64 = image_result.get("base64") or base64.b64encode(image_bytes).decode("utf-8")

        audio_b64 = None
        audio_transcript = None
        audio_mood = None
        if audio_file:
            audio_bytes = await audio_file.read()
            audio_result = _process_audio_bytes(audio_bytes, audio_file.filename or "voice.webm")
            audio_b64 = audio_result.get("audio_base64") or base64.b64encode(audio_bytes).decode("utf-8")
            audio_transcript = audio_result.get("transcript")
            audio_mood = audio_result.get("mood")

        relationship_tags = _build_relationship_tags(relation, notes, age)
        profile_text = " ".join(
            part for part in [
                f"person {name}",
                f"relation {relation}",
                f"notes {notes or ''}",
                f"age {age or ''}",
                image_result.get("caption", ""),
                image_result.get("quality_score", ""),
                audio_transcript or "",
            ] if part
        )
        from lifelens.ingestion.upsert_memory import get_embedding
        vector = get_embedding(profile_text)

        profile_id = str(uuid.uuid4())
        timestamp = int(time.time())
        avatar_url = f"https://api.dicebear.com/7.x/notionists/svg?seed={name}"

        payload = {
            "type": "enrollment_profile",
            "enrollment_type": "person",
            "patient_id": patient_id,
            "name": name,
            "relation": relation,
            "age": age,
            "notes": notes or "",
            "relationship_tags": relationship_tags,
            "image_caption": image_result.get("caption"),
            "image_quality_score": image_result.get("quality_score"),
            "image_retry_count": image_result.get("retry_count"),
            "voice_transcript": audio_transcript,
            "voice_mood": audio_mood,
            "image_base64": image_b64,
            "audio_base64": audio_b64,
            "avatar_url": avatar_url,
            "timestamp": timestamp,
        }

        client.upsert(
            collection_name=ENROLLMENT_COLLECTION_NAME,
            points=[models.PointStruct(id=profile_id, vector=vector, payload=payload)],
        )

        return {"status": "stored", "profile_id": profile_id, "name": name, "avatar_url": avatar_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enroll person failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/enrollment/object")
async def enroll_object(
    patient_id: str = Form(...),
    name: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token),
):
    try:
        _check_enrollment_access(user, patient_id)
        client = get_client()
        ensure_enrollment_collection(client)

        image_bytes = await file.read()
        image_result = _process_image_bytes(image_bytes)
        image_b64 = image_result.get("base64") or base64.b64encode(image_bytes).decode("utf-8")

        detected_objects = []
        caption = (image_result.get("caption") or "").lower()
        for token in ["wallet", "box", "bottle", "key", "phone", "medicine", "bag", "glasses"]:
            if token in caption:
                detected_objects.append(token)

        spatial_labels = []
        if notes:
            spatial_labels = [word.strip(",.;:") for word in notes.split() if len(word.strip()) > 2][:5]

        profile_text = " ".join(
            part for part in [
                f"object {name}",
                f"notes {notes or ''}",
                f"patient {patient_id}",
                image_result.get("caption", ""),
            ] if part
        )
        from lifelens.ingestion.upsert_memory import get_embedding
        vector = get_embedding(profile_text)

        profile_id = str(uuid.uuid4())
        timestamp = int(time.time())

        payload = {
            "type": "enrollment_profile",
            "enrollment_type": "object",
            "patient_id": patient_id,
            "name": name,
            "notes": notes or "",
            "image_caption": image_result.get("caption"),
            "image_quality_score": image_result.get("quality_score"),
            "detected_objects": detected_objects,
            "spatial_labels": spatial_labels,
            "image_base64": image_b64,
            "timestamp": timestamp,
        }

        client.upsert(
            collection_name=ENROLLMENT_COLLECTION_NAME,
            points=[models.PointStruct(id=profile_id, vector=vector, payload=payload)],
        )

        return {"status": "stored", "profile_id": profile_id, "name": name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enroll object failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/enrollment/{patient_id}")
def get_enrollment_records(patient_id: str, limit: int = 30, user: dict = Depends(verify_token)):
    try:
        _check_enrollment_access(user, patient_id)
        client = get_client()
        ensure_enrollment_collection(client)

        points, _ = client.scroll(
            collection_name=ENROLLMENT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id))]
            ),
            with_payload=True,
            with_vectors=False,
            limit=limit,
        )

        records = []
        for point in points:
            payload = point.payload or {}
            records.append(
                {
                    "id": str(point.id),
                    "patient_id": payload.get("patient_id"),
                    "name": payload.get("name"),
                    "enrollment_type": payload.get("enrollment_type"),
                    "relation": payload.get("relation"),
                    "age": payload.get("age"),
                    "notes": payload.get("notes"),
                    "relationship_tags": payload.get("relationship_tags", []),
                    "image_caption": payload.get("image_caption"),
                    "image_quality_score": payload.get("image_quality_score"),
                    "voice_transcript": payload.get("voice_transcript"),
                    "voice_mood": payload.get("voice_mood"),
                    "detected_objects": payload.get("detected_objects", []),
                    "spatial_labels": payload.get("spatial_labels", []),
                    "image_base64": payload.get("image_base64"),
                    "audio_base64": payload.get("audio_base64"),
                    "timestamp": payload.get("timestamp"),
                }
            )

        records.sort(key=lambda r: r.get("timestamp", 0), reverse=True)
        return {"records": records}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get enrollment records failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MEMORIES ====================

@app.post("/api/search")
def search(request: SearchRequest, user: dict = Depends(verify_token)):
    try:
        client = get_client()
        if user["role"] == "caretaker" and request.patient_id not in user.get("patients", []):
            pass  # Allow for now, access control can be tightened later

        if not request.query or request.query.strip() == "":
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        memories = search_memories(
            client=client, query=request.query, patient_id=request.patient_id, top_k=request.top_k
        )
        memories = [m for m in memories if m.get("score", 0) > 0.45]
        
        # Format for frontend
        formatted_memories = []
        for m in memories:
            formatted_memories.append({
                **m,
                "collection_name": m.get("collection_name"),
                "image_base64": m.get("source_image_base64"),
                "audio_base64": m.get("source_audio_base64")
            })
            
        answer = get_answer(request.query, formatted_memories)

        return {"answer": answer, "memories": formatted_memories}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memories/{patient_id}")
def get_recent_memories(patient_id: str, limit: int = 50, user: dict = Depends(verify_token)):
    """Get recent memories for Memory Lane view."""
    try:
        client = get_client()
        results = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id))],
                must_not=[models.FieldCondition(key="type", match=models.MatchValue(value="agent_decision"))],
            ),
            limit=limit,
            with_payload=models.PayloadSelectorExclude(
                exclude=["image_base64", "source_image_base64", "audio_base64", "source_audio_base64", "base64", "content_embedding", "embedding"]
            ),
            with_vectors=False,
        )[0]

        memories = []
        for point in results:
            payload = point.payload
            memories.append({
                "id": str(point.id),
                "type": payload.get("type"),
                "content": payload.get("content"),
                "caption": payload.get("caption"),
                "transcript": payload.get("transcript"),
                "analysis": payload.get("analysis"),
                "timestamp": payload.get("timestamp"),
                "person_tags": payload.get("person_tags"),
                "location": payload.get("location"),
                "sentiment": payload.get("sentiment"),
                "category": payload.get("category"),
                "image_base64": None,
                "audio_base64": None,
                "has_media": bool(payload.get("type") in ["image", "audio"])
            })

        memories.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return {"memories": memories}

    except Exception as e:
        logger.error(f"Get memories failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/memories/media/{memory_id}")
def get_memory_media(memory_id: str):
    """Retrieve full memory payload for media (images/audio)"""
    client = get_client()
    try:
        results = client.retrieve(
            collection_name=QDRANT_COLLECTION_NAME,
            ids=[memory_id],
            with_payload=True,
            with_vectors=False
        )
        if not results:
            raise HTTPException(status_code=404, detail="Memory not found")
            
        payload = results[0].payload
        return {
            "image_base64": payload.get("source_image_base64") or payload.get("image_base64") or payload.get("base64"),
            "audio_base64": payload.get("source_audio_base64") or payload.get("audio_base64")
        }
    except Exception as e:
        logger.error(f"Get memory media failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/memory/create")
def create_memory(request: MemoryCreate, user: dict = Depends(verify_token)):
    try:
        client = get_client()
        from lifelens.ingestion.text_processor import process_text

        data = process_text(request.content)
        data["patient_id"] = request.patient_id
        data["timestamp"] = int(time.time())
        data["source"] = "web"

        if request.tags:
            data["person_tags"] = request.tags
        if request.url:
            data["url"] = request.url
            data["title"] = request.title
        if request.location_text:
            data["location"] = {"name": request.location_text}
        if request.location:
            data["location"] = request.location
        if request.is_milestone:
            data["category"] = "Achievement"

        upsert_memory(client, "text", data)
        return {"status": "success", "message": "Memory created"}

    except Exception as e:
        logger.error(f"Create memory failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    caption: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_milestone: bool = Form(False),
    user: dict = Depends(verify_token),
):
    try:
        client = get_client()
        from lifelens.ingestion.image_processor import process_image

        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        try:
            with open(temp_filename, "rb") as f:
                result = process_image(f)
        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

        data = {
            "patient_id": patient_id,
            "base64": result["base64"],
            "caption": result["caption"],
            "sentiment": result.get("sentiment"),
            "source": "web",
        }
        if tags:
            data["person_tags"] = tags
        if caption:
            data["caption"] = f"{caption} ({result['caption']})"
        if is_milestone:
            data["category"] = "Achievement"

        upsert_memory(client, "image", data)
        return {"status": "success", "message": "Image memory created"}

    except Exception as e:
        logger.error(f"Image upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/audio")
async def upload_audio(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    user: dict = Depends(verify_token),
):
    try:
        from lifelens.ingestion.audio_processor import process_audio

        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        try:
            result = process_audio(temp_filename)
        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

        client = get_client()
        data = {
            "patient_id": patient_id,
            "audio_base64": result["audio_base64"],
            "transcript": result["transcript"],
            "source": "web",
        }

        upsert_memory(client, "audio", data)
        return {"status": "success", "message": "Audio memory created", "transcript": result["transcript"]}

    except Exception as e:
        logger.error(f"Audio upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHAT (Agentic Flow) ====================

@app.post("/api/chat")
def chat(request: ChatRequest, user: dict = Depends(verify_token)):
    """Main chat endpoint - wraps the multi-agent orchestrator."""
    try:
        client = get_client()

        if request.agentic_mode:
            from lifelens.orchestrator import run_agentic_flow

            result = run_agentic_flow(request.question, request.patient_id, client, max_retries=1)

            # Build agent workflow info for the frontend
            agent_workflow = {
                "planner": result["plan"].get("reasoning", "Planning complete"),
                "critic": f"Verdict: {result['verdict']}",
                "triggers": f"{len(result['triggers'])} triggers generated" if result["triggers"] else "No triggers needed",
                "recommendations": "\n".join(
                    [f"• {r.get('message', '')}" for r in result.get("recommendations", [])]
                ) or "No specific recommendations",
                "trace": result.get("trace", []),
            }

            # Format sources for frontend
            evidence = []
            for mem in result.get("sources", []):
                evidence.append({
                    "id": str(uuid.uuid4()),
                    "type": mem.get("type", "text"),
                    "collection_name": mem.get("collection_name"),
                    "content": mem.get("content"),
                    "caption": mem.get("caption"),
                    "transcript": mem.get("transcript"),
                    "timestamp": mem.get("timestamp"),
                    "person_tags": mem.get("person_tags"),
                    "sentiment": mem.get("sentiment"),
                    "image_base64": mem.get("source_image_base64"),
                    "audio_base64": mem.get("source_audio_base64"),
                    "score": mem.get("score", 0),
                    "keywords": mem.get("keyword_matches", []),
                })

            return {
                "answer": result["answer"],
                "evidence": evidence,
                "agent_workflow": agent_workflow,
                "session_id": result.get("session_id"),
                "similarity_score": evidence[0]["score"] if evidence else None,
                "keywords": result["plan"].get("keywords", []),
            }
        else:
            # Legacy flow
            memories = search_memories(client=client, query=request.question, patient_id=request.patient_id)
            memories = [m for m in memories if m.get("score", 0) > 0.45]
            answer = get_answer(request.question, memories)

            return {
                "answer": answer,
                "evidence": memories,
                "agent_workflow": None,
                "session_id": None,
                "similarity_score": memories[0].get("score") if memories else None,
                "keywords": [],
            }

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DASHBOARD ====================

@app.get("/api/dashboard/stats/{patient_id}")
def get_dashboard_stats(patient_id: str, user: dict = Depends(verify_token)):
    """Memory analytics for caretaker dashboard."""
    try:
        client = get_client()
        from lifelens.utils.analytics import get_memory_stats

        stats = get_memory_stats(client, patient_id)

        # Convert daily_counts keys (date objects) to strings
        daily_counts = {}
        for date_key, count in stats.get("daily_counts", {}).items():
            daily_counts[str(date_key)] = count

        return {
            "total_count": stats.get("total_count", 0),
            "recent_count": stats.get("recent_count", 0),
            "streak": stats.get("streak", 0),
            "type_counts": stats.get("type_counts", {}),
            "mood_distribution": stats.get("mood_distribution", {}),
            "daily_counts": daily_counts,
        }

    except Exception as e:
        logger.error(f"Dashboard stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/mood/{patient_id}")
def get_mood_data(patient_id: str, days: int = 30, user: dict = Depends(verify_token)):
    """Mood trend data for dashboard charts."""
    try:
        client = get_client()

        # Fetch memories with sentiment
        results = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id))],
                must_not=[models.FieldCondition(key="type", match=models.MatchValue(value="agent_decision"))],
            ),
            limit=500,
            with_payload=models.PayloadSelectorExclude(
                exclude=["image_base64", "source_image_base64", "audio_base64", "source_audio_base64", "base64", "content_embedding", "embedding"]
            ),
            with_vectors=False,
        )[0]

        # Build mood timeline
        cutoff = time.time() - (days * 86400)
        mood_points = []
        sentiment_counts = {}

        for point in results:
            payload = point.payload
            ts = payload.get("timestamp", 0)
            sentiment = payload.get("sentiment")

            if ts >= cutoff and sentiment:
                date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")

                # Map sentiment to score
                score_map = {
                    "Happy": 8, "happy": 8,
                    "Neutral": 6, "neutral": 6,
                    "Confused": 4, "confused": 4,
                    "Sad": 3, "sad": 3,
                    "Angry": 2, "angry": 2,
                    "anxious": 4, "Anxious": 4,
                }
                score = score_map.get(sentiment, 5)

                mood_points.append({
                    "date": date_str,
                    "score": score,
                    "sentiment": sentiment,
                })

                sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1

        # Build distribution
        total_sentiments = sum(sentiment_counts.values()) or 1
        color_map = {
            "Happy": "#10B981", "happy": "#10B981",
            "Neutral": "#6B7280", "neutral": "#6B7280",
            "Sad": "#3B82F6", "sad": "#3B82F6",
            "Angry": "#EF4444", "angry": "#EF4444",
            "Confused": "#8B5CF6", "confused": "#8B5CF6",
            "Anxious": "#F59E0B", "anxious": "#F59E0B",
        }
        if not sentiment_counts:
            # Fallback for display/demo if no DB items have sentiment recorded yet
            distribution = [
                {"emotion": "Happy", "count": 12, "percentage": 40, "color": "#10B981"},
                {"emotion": "Neutral", "count": 8, "percentage": 27, "color": "#6B7280"},
                {"emotion": "Anxious", "count": 5, "percentage": 17, "color": "#F59E0B"},
                {"emotion": "Sad", "count": 3, "percentage": 10, "color": "#3B82F6"},
                {"emotion": "Confused", "count": 2, "percentage": 6, "color": "#8B5CF6"},
            ]
        else:
            distribution = [
                {
                    "emotion": k,
                    "count": v,
                    "percentage": round(v / total_sentiments * 100),
                    "color": color_map.get(k, "#6B7280"),
                }
                for k, v in sentiment_counts.items()
            ]

        mood_points.sort(key=lambda x: x["date"])

        return {
            "mood_trend": mood_points,
            "distribution": distribution,
        }

    except Exception as e:
        logger.error(f"Mood data failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/insights/{patient_id}")
def get_insights(patient_id: str, user: dict = Depends(verify_token)):
    """AI-generated insights for caretaker dashboard."""
    try:
        client = get_client()
        from lifelens.agents import generate_dashboard_insights

        insights = generate_dashboard_insights(patient_id, client, days_back=7)
        return insights

    except Exception as e:
        logger.error(f"Insights generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MEDICATIONS ====================

@app.get("/api/medications/{patient_id}")
def get_medications(patient_id: str, user: dict = Depends(verify_token)):
    """List active medications for a patient."""
    try:
        client = get_client()
        from lifelens.utils.medication_utils import get_all_patient_medications

        meds = get_all_patient_medications(client, patient_id, active_only=True)
        return {"medications": meds}

    except Exception as e:
        logger.error(f"Get medications failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/medications")
def add_medication(request: MedicationCreate, user: dict = Depends(verify_token)):
    """Add a new medication."""
    try:
        client = get_client()
        from lifelens.agents import validate_medication, plan_medication_schedule

        med_data = {
            "patient_id": request.patient_id,
            "name": request.name,
            "dosage": request.dosage,
            "frequency": request.frequency,
            "schedule": request.schedule,
            "start_date": request.start_date or datetime.now().date().isoformat(),
            "end_date": request.end_date,
            "notes": request.notes or "",
            "prescribed_by": request.prescribed_by or "",
            "active": True,
        }

        # Validate with agent
        try:
            validation = validate_medication(med_data, client)
            if not validation.get("valid", True):
                return {"status": "warning", "message": validation.get("reason", "Validation warning"), "medication": med_data}
        except Exception:
            pass

        # Plan schedule with agent
        try:
            plan_medication_schedule(med_data, client)
        except Exception:
            pass

        return {"status": "success", "message": "Medication added", "medication": med_data}

    except Exception as e:
        logger.error(f"Add medication failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/medications/{patient_id}/events")
def get_medication_events(patient_id: str, date: Optional[str] = None, user: dict = Depends(verify_token)):
    """Get today's medication schedule with status."""
    try:
        client = get_client()
        from lifelens.agents.medication_scheduler import get_todays_medications

        events = get_todays_medications(client, patient_id)
        return {"events": events}

    except Exception as e:
        logger.error(f"Get medication events failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/medications/dose")
def mark_dose(request: DoseAction, user: dict = Depends(verify_token)):
    """Mark a medication dose as taken or skipped."""
    try:
        client = get_client()
        from lifelens.utils.medication_utils import record_medication_event

        event_data = {
            "patient_id": request.patient_id,
            "medication_id": request.medication_id,
            "status": request.status,
            "reported_by": request.reported_by,
            "note": request.note or "",
            "dose_time": request.dose_time,
            "dose_date": request.dose_date or datetime.now().date().isoformat(),
        }

        success = record_medication_event(client, event_data)
        if success:
            return {"status": "success", "message": f"Dose marked as {request.status}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to record event")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark dose failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/medications/{patient_id}/adherence")
def get_adherence(patient_id: str, days: int = 7, user: dict = Depends(verify_token)):
    """Get medication adherence data."""
    try:
        client = get_client()
        from lifelens.utils.medication_utils import calculate_adherence_rate, get_adherence_calendar

        rate = calculate_adherence_rate(client, patient_id, days=days)
        calendar = get_adherence_calendar(client, patient_id, days=days)

        # Convert to frontend format
        adherence_data = []
        for date_str, counts in sorted(calendar.items()):
            total = counts.get("total", 0)
            taken = counts.get("taken", 0)
            adherence_data.append({
                "date": date_str,
                "taken": taken,
                "missed": counts.get("missed", 0),
                "skipped": counts.get("skipped", 0),
                "total": total,
                "adherence": round((taken / total * 100) if total > 0 else 0),
            })

        return {
            "overall_rate": round(rate * 100, 1),
            "daily_data": adherence_data,
        }

    except Exception as e:
        logger.error(f"Get adherence failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TRIGGERS ====================

@app.get("/api/triggers/{patient_id}")
def get_triggers(patient_id: str, user: dict = Depends(verify_token)):
    """Get active triggers for a patient."""
    try:
        from lifelens.utils.trigger_storage import load_triggers

        triggers = load_triggers(patient_id, include_dismissed=False)

        # Format for frontend
        formatted = []
        for t in triggers:
            formatted.append({
                "id": t.get("id"),
                "patientId": patient_id,
                "type": t.get("type", "unknown"),
                "severity": t.get("priority", "medium"),
                "message": t.get("message", ""),
                "timestamp": t.get("created_at", ""),
                "status": "dismissed" if t.get("dismissed") else "active",
                "details": t.get("details", ""),
            })

        return {"triggers": formatted}

    except Exception as e:
        logger.error(f"Get triggers failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/triggers/{trigger_id}/dismiss")
def dismiss_trigger_endpoint(trigger_id: str, patient_id: str, user: dict = Depends(verify_token)):
    """Dismiss a trigger."""
    try:
        from lifelens.utils.trigger_storage import dismiss_trigger

        client = get_client()
        success = dismiss_trigger(trigger_id, patient_id, qdrant_client=client)

        if success:
            return {"status": "success", "message": "Trigger dismissed"}
        else:
            raise HTTPException(status_code=404, detail="Trigger not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dismiss trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/triggers/test-alert")
def test_alert(patient_id: str, user: dict = Depends(verify_token)):
    """Send a test notification alert."""
    try:
        from lifelens.utils.ntfy_notifications import send_ntfy_notification

        send_ntfy_notification(
            title="LifeLens Test Alert",
            message="This is a test notification from LifeLens.",
            priority="default",
        )
        return {"message": "Test alert sent successfully to configured notification channels."}

    except Exception as e:
        logger.error(f"Test alert failed: {e}")
        return {"message": f"Test alert attempted. Result: {str(e)}"}


# ==================== FAMILY PORTAL ====================

@app.get("/api/family/summary/{patient_id}")
def get_family_summary(patient_id: str, period: str = "week", user: dict = Depends(verify_token)):
    """AI-generated family summary."""
    try:
        client = get_client()
        from lifelens.agents import generate_family_summary

        summary = generate_family_summary(patient_id, client, period=period)
        return summary

    except Exception as e:
        logger.error(f"Family summary failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/family/requests/{patient_id}")
def get_family_requests(patient_id: str, user: dict = Depends(verify_token)):
    """Get memory requests for a patient."""
    try:
        from lifelens.utils.memory_requests import get_requests_for_patient

        requests = get_requests_for_patient(patient_id)
        return {"requests": requests}

    except Exception as e:
        logger.error(f"Get family requests failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/family/requests")
def create_family_request(request: FamilyRequestCreate, user: dict = Depends(verify_token)):
    """Submit a new memory request."""
    try:
        from lifelens.utils.memory_requests import create_request

        request_id = create_request(
            patient_id=request.patient_id,
            requester_name=request.requester_name,
            memory_type=request.memory_type,
            description=request.description,
            details=request.details,
        )
        return {"status": "success", "request_id": request_id}

    except Exception as e:
        logger.error(f"Create family request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/family/requests/{request_id}")
def update_family_request(request_id: str, request: FamilyRequestUpdate, user: dict = Depends(verify_token)):
    """Update a memory request status."""
    try:
        from lifelens.utils.memory_requests import update_request_status

        update_request_status(request_id, request.status, request.notes)
        return {"status": "success", "message": "Request updated"}

    except Exception as e:
        logger.error(f"Update family request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/family/milestones/{patient_id}")
def get_milestones(patient_id: str, user: dict = Depends(verify_token)):
    """Get milestone/achievement memories."""
    try:
        client = get_client()

        results = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id)),
                    models.FieldCondition(key="category", match=models.MatchValue(value="Achievement")),
                ],
            ),
            limit=50,
            with_payload=True,
            with_vectors=False,
        )[0]

        milestones = []
        for point in results:
            payload = point.payload
            milestones.append({
                "id": str(point.id),
                "type": payload.get("type"),
                "caption": payload.get("caption"),
                "content": payload.get("content"),
                "transcript": payload.get("transcript"),
                "timestamp": payload.get("timestamp"),
                "person_tags": payload.get("person_tags"),
                "sentiment": payload.get("sentiment"),
            })

        milestones.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return {"milestones": milestones}

    except Exception as e:
        logger.error(f"Get milestones failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/family/messages/{patient_id}")
def get_messages(patient_id: str, user: dict = Depends(verify_token)):
    """Get message board entries. Uses a simple JSON file."""
    try:
        import json

        messages_file = "family_messages.json"
        if os.path.exists(messages_file):
            with open(messages_file, "r") as f:
                all_messages = json.load(f)
        else:
            all_messages = []

        patient_messages = [m for m in all_messages if m.get("patient_id") == patient_id]
        patient_messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return {"messages": patient_messages}

    except Exception as e:
        logger.error(f"Get messages failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/family/messages")
def post_message(request: MessageCreate, user: dict = Depends(verify_token)):
    """Post a new message to the family board."""
    try:
        import json

        messages_file = "family_messages.json"
        if os.path.exists(messages_file):
            with open(messages_file, "r") as f:
                all_messages = json.load(f)
        else:
            all_messages = []

        new_message = {
            "id": f"msg-{uuid.uuid4()}",
            "patient_id": request.patient_id,
            "authorName": request.author_name,
            "content": request.content,
            "timestamp": datetime.now().isoformat(),
        }

        all_messages.append(new_message)

        with open(messages_file, "w") as f:
            json.dump(all_messages, f, indent=2)

        return {"status": "success", "message": new_message}

    except Exception as e:
        logger.error(f"Post message failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SUGGESTIONS ====================

@app.get("/api/suggestions/{patient_id}")
def get_suggestions(patient_id: str, user: dict = Depends(verify_token)):
    """Get AI agent suggestions."""
    try:
        client = get_client()
        from lifelens.agents import suggest_captures

        suggestions = suggest_captures(patient_id, client)

        formatted = []
        for s in (suggestions or []):
            formatted.append({
                "id": str(uuid.uuid4()),
                "type": s.get("type", "suggestion"),
                "title": s.get("title", "Suggestion"),
                "description": s.get("message", ""),
                "timestamp": datetime.now().isoformat(),
            })

        return {"suggestions": formatted}

    except Exception as e:
        logger.error(f"Get suggestions failed: {e}")
        return {"suggestions": []}


# ==================== MAP ====================

@app.get("/api/map/memories/{patient_id}")
def get_map_memories(patient_id: str, user: dict = Depends(verify_token)):
    """Get memories with location data for the map view."""
    try:
        client = get_client()

        results = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id))],
                must_not=[models.FieldCondition(key="type", match=models.MatchValue(value="agent_decision"))],
            ),
            limit=200,
            with_payload=True,
            with_vectors=False,
        )[0]

        map_memories = []
        for point in results:
            payload = point.payload
            location = payload.get("location")
            if location and isinstance(location, dict) and location.get("lat") and location.get("lon"):
                map_memories.append({
                    "id": str(point.id),
                    "type": payload.get("type"),
                    "caption": payload.get("caption"),
                    "content": payload.get("content"),
                    "transcript": payload.get("transcript"),
                    "timestamp": payload.get("timestamp"),
                    "person_tags": payload.get("person_tags"),
                    "sentiment": payload.get("sentiment"),
                    "location": location,
                })

        return {"memories": map_memories}

    except Exception as e:
        logger.error(f"Get map memories failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== REMINDERS ====================

@app.get("/api/reminders")
def get_reminders(user: dict = Depends(verify_token)):
    """Get active reminders."""
    try:
        from lifelens.utils.reminders import load_reminders
        reminders = load_reminders()
        return {"reminders": reminders or []}
    except Exception as e:
        logger.error(f"Get reminders failed: {e}")
        return {"reminders": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
