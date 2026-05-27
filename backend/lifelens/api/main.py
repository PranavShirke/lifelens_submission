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
from datetime import datetime, timedelta
import asyncio

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from lifelens.config import QDRANT_COLLECTION_NAME, JWT_SECRET, JWT_ALGORITHM, EXCLUDED_MEMORY_TYPES
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
from lifelens.avatar.collections import ensure_avatar_collections
from lifelens.api.avatar_routes import router as avatar_router, v1_router as avatar_v1_router
from qdrant_client.http import models
from lifelens.utils.scheduler import nagging_loop
from lifelens.utils.security import contains_prompt_injection, contains_profanity, check_image_nudity, validate_file_mime

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

# Avatar Assistant routes (namespaced to avoid conflicts)
app.include_router(avatar_router)
app.include_router(avatar_v1_router)


# ==================== STARTUP ====================

@app.on_event("startup")
async def on_startup():
    """Initialize DB collections and default users on startup."""
    try:
        initialize_default_users()
        client = get_qdrant_client()
        create_collection_if_not_exists(client)
        create_mood_collections_if_not_exist(client)
        create_medication_collections_if_not_exist(client)
        create_agent_decisions_collection_if_not_exist(client)
        avatar_collections = ensure_avatar_collections()
        logger.info("✅ Avatar collections ready: %s", avatar_collections)
        
        # Start the background nagging loop for reminders
        asyncio.create_task(nagging_loop())
        logger.info("✅ Reminder nagging scheduler started")
        
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
                must_not=[
                    models.FieldCondition(key="type", match=models.MatchValue(value=t))
                    for t in EXCLUDED_MEMORY_TYPES
                ],
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

        if contains_profanity(request.content):
            raise HTTPException(status_code=400, detail="Profanity detected in memory content.")

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
    location: Optional[str] = Form(None),
    user: dict = Depends(verify_token),
):
    try:
        client = get_client()
        from lifelens.ingestion.image_processor import process_image

        content = await file.read()
        if not validate_file_mime(content, ["image/jpeg", "image/png", "image/webp"]):
            raise HTTPException(status_code=400, detail="Invalid image file format.")

        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)

        if check_image_nudity(temp_filename):
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            raise HTTPException(status_code=400, detail="Inappropriate image content detected.")

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
        if location:
            import json
            data["location"] = json.loads(location)

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

        content = await file.read()
        if not validate_file_mime(content, ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/flac"]):
            raise HTTPException(status_code=400, detail="Invalid audio file format.")

        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
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
    if contains_prompt_injection(request.question):
        raise HTTPException(status_code=400, detail="Invalid prompt structure detected.")
    if contains_profanity(request.question):
        raise HTTPException(status_code=400, detail="Profanity detected in chat query.")
        
    try:
        client = get_client()

        if request.agentic_mode:
            from lifelens.langgraph_orchestrator import run_agentic_flow

            result = run_agentic_flow(request.question, request.patient_id, client, max_retries=1)

            # Build agent workflow info for the frontend
            _plan = result.get("plan") or {} if result else {}
            
            agent_workflow = {
                "planner": _plan.get("reasoning", "Planning complete"),
                "critic": f"Verdict: {result.get('verdict', 'pass')}" if result else "Verdict: pass",
                "triggers": f"{len(result.get('triggers', []))} triggers generated" if result and result.get("triggers") else "No triggers needed",
                "recommendations": "\n".join(
                    [f"• {r.get('message', '')}" for r in (result.get("recommendations", []) if result else [])]
                ) or "No specific recommendations",
                "trace": [],
            }

            # Format sources for frontend
            evidence = []
            for mem in result.get("sources", []):
                evidence.append({
                    "id": str(uuid.uuid4()),
                    "type": mem.get("type", "text"),
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
                must_not=[
                    models.FieldCondition(key="type", match=models.MatchValue(value=t))
                    for t in EXCLUDED_MEMORY_TYPES
                ],
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


@app.delete("/api/medications/{med_id}")
def delete_medication_endpoint(med_id: str, patient_id: str, user: dict = Depends(verify_token)):
    """Delete a medication."""
    try:
        client = get_client()
        from lifelens.utils.medication_utils import delete_medication
        
        success = delete_medication(client, med_id, patient_id)
        if success:
            return {"status": "success", "message": "Medication deleted"}
        else:
            raise HTTPException(status_code=404, detail="Medication not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete medication failed: {e}")
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
    """Get active triggers for a patient — generates fresh ones from live data."""
    try:
        from lifelens.utils.trigger_storage import load_triggers, save_trigger
        from lifelens.utils.trigger_agent import generate_triggers

        client = get_client()

        # 1) Load persisted (non-dismissed) triggers
        stored = load_triggers(patient_id, include_dismissed=False)
        stored_messages = {t.get("message", "") for t in stored}

        # 2) Generate fresh triggers from live Qdrant data
        fresh = generate_triggers(client, patient_id)

        # 3) Auto-persist any NEW fresh triggers so they can be dismissed
        for ft in fresh:
            if ft.get("message", "") not in stored_messages:
                save_trigger(ft, patient_id)
                stored.append({**ft, "dismissed": False, "created_at": ft.get("timestamp", "")})

        # Also generate medication-based triggers
        try:
            from lifelens.utils.medication_utils import get_medication_history, get_all_patient_medications
            events = get_medication_history(client, patient_id, days=3)
            meds = get_all_patient_medications(client, patient_id)
            
            missed_today = [e for e in events if e.get("status") == "missed" and e.get("dose_date") == datetime.now().date().isoformat()]
            missed_recent = [e for e in events if e.get("status") in ("missed", "skipped")]
            
            if missed_today:
                msg = f"{len(missed_today)} medication dose(s) missed today. Please follow up."
                if msg not in stored_messages:
                    med_trigger = {"type": "missed_medication", "title": "Missed Medication Alert", "message": msg, "priority": "high", "timestamp": datetime.now().isoformat()}
                    save_trigger(med_trigger, patient_id)
                    stored.append({**med_trigger, "dismissed": False, "created_at": med_trigger["timestamp"]})
            
            if len(missed_recent) >= 3:
                msg = f"{len(missed_recent)} doses missed/skipped in the last 3 days. Adherence needs attention."
                if msg not in stored_messages:
                    adh_trigger = {"type": "missed_medication", "title": "Adherence Declining", "message": msg, "priority": "urgent", "timestamp": datetime.now().isoformat()}
                    save_trigger(adh_trigger, patient_id)
                    stored.append({**adh_trigger, "dismissed": False, "created_at": adh_trigger["timestamp"]})

            # Check if patient has meds but 0 events today (all pending)
            if meds and not any(e.get("dose_date") == datetime.now().date().isoformat() for e in events):
                total_doses = sum(len(m.get("schedule", [])) for m in meds)
                if total_doses > 0:
                    msg = f"No medications taken yet today. {total_doses} dose(s) are scheduled."
                    if msg not in stored_messages:
                        pending_trigger = {"type": "missed_medication", "title": "Medication Reminder", "message": msg, "priority": "medium", "timestamp": datetime.now().isoformat()}
                        save_trigger(pending_trigger, patient_id)
                        stored.append({**pending_trigger, "dismissed": False, "created_at": pending_trigger["timestamp"]})
        except Exception as med_err:
            logger.warning(f"Medication trigger check failed: {med_err}")

        # Reload stored triggers (now includes freshly saved ones)
        all_triggers = load_triggers(patient_id, include_dismissed=False)

        # Format for frontend
        formatted = []
        seen_msgs = set()
        for t in all_triggers:
            msg = t.get("message", "")
            if msg in seen_msgs:
                continue
            seen_msgs.add(msg)
            
            # Map trigger type to frontend severity scheme
            priority = t.get("priority", t.get("severity", "medium"))
            trigger_type = t.get("type", "unknown")
            # Map type names for frontend
            type_map = {
                "memory_gap": "inactivity",
                "media_gap": "inactivity",
                "mood_trend": "mood_decline",
                "untagged_people": "unusual_pattern",
                "milestone_anniversary": "unusual_pattern",
            }
            
            formatted.append({
                "id": t.get("id"),
                "patientId": patient_id,
                "type": type_map.get(trigger_type, trigger_type),
                "severity": priority,
                "message": msg,
                "timestamp": t.get("created_at", t.get("timestamp", "")),
                "status": "dismissed" if t.get("dismissed") else "active",
                "details": t.get("details", t.get("title", "")),
            })

        # Sort: urgent first
        priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        formatted.sort(key=lambda x: priority_order.get(x.get("severity", "medium"), 2))

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

class ReminderCreate(BaseModel):
    patient_id: str
    task: str
    time: str

@app.get("/api/reminders/{patient_id}")
def get_reminders(patient_id: str, user: dict = Depends(verify_token)):
    """Get active (non-completed) reminders for a patient."""
    try:
        from lifelens.utils.reminders import get_reminders_for_patient
        reminders = get_reminders_for_patient(patient_id)
        return {"reminders": reminders or []}
    except Exception as e:
        logger.error(f"Get reminders failed: {e}")
        return {"reminders": []}

@app.get("/api/reminders")
def get_reminders_legacy(user: dict = Depends(verify_token)):
    """Legacy: Get all reminders."""
    try:
        from lifelens.utils.reminders import load_reminders
        reminders = load_reminders()
        return {"reminders": reminders or []}
    except Exception as e:
        logger.error(f"Get reminders failed: {e}")
        return {"reminders": []}

@app.post("/api/reminders")
def create_reminder(request: ReminderCreate, user: dict = Depends(verify_token)):
    """Create a new reminder."""
    try:
        from lifelens.utils.reminders import add_reminder
        reminder = add_reminder(request.patient_id, request.task, request.time)
        return {"status": "success", "reminder": reminder}
    except Exception as e:
        logger.error(f"Create reminder failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reminders/{reminder_id}/complete")
def complete_reminder(reminder_id: str, user: dict = Depends(verify_token)):
    """Mark a reminder as completed."""
    try:
        from lifelens.utils.reminders import complete_reminder as do_complete
        success = do_complete(reminder_id)
        if success:
            return {"status": "success", "message": "Reminder completed"}
        else:
            raise HTTPException(status_code=404, detail="Reminder not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Complete reminder failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: str, user: dict = Depends(verify_token)):
    """Delete a reminder."""
    try:
        from lifelens.utils.reminders import delete_reminder as do_delete
        success = do_delete(reminder_id)
        if success:
            return {"status": "success", "message": "Reminder deleted"}
        else:
            raise HTTPException(status_code=404, detail="Reminder not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete reminder failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EXPORT ====================

@app.get("/api/export/memory-book/{patient_id}")
def export_memory_book(patient_id: str, user: dict = Depends(verify_token)):
    """Generate and return a downloadable HTML memory book."""
    try:
        from fastapi.responses import HTMLResponse
        from lifelens.utils.export import generate_memory_book_html

        client = get_client()

        # Fetch all memories with full payload (including media)
        results = client.scroll(
            collection_name=QDRANT_COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[models.FieldCondition(key="patient_id", match=models.MatchValue(value=patient_id))],
                must_not=[
                    models.FieldCondition(key="type", match=models.MatchValue(value=t))
                    for t in EXCLUDED_MEMORY_TYPES
                ],
            ),
            limit=200,
            with_payload=True,
            with_vectors=False,
        )[0]

        memories = [point.payload for point in results]

        # Resolve patient name
        patient_name = patient_id
        try:
            patients = get_all_patients()
            for p in patients:
                if isinstance(p, dict) and p.get("id") == patient_id:
                    patient_name = p.get("name", patient_id)
                    break
                elif isinstance(p, str) and p == patient_id:
                    patient_name = patient_id
                    break
        except:
            pass

        html = generate_memory_book_html(memories, patient_name)

        return HTMLResponse(
            content=html,
            media_type="text/html",
            headers={
                "Content-Disposition": f'attachment; filename="{patient_name}_memory_book.html"'
            }
        )

    except Exception as e:
        logger.error(f"Export memory book failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MEMORY DELETION ====================

@app.delete("/api/memories/{memory_id}")
def delete_memory(memory_id: str, user: dict = Depends(verify_token)):
    """Delete a specific memory from Qdrant."""
    try:
        client = get_client()

        # Verify memory exists
        try:
            results = client.retrieve(
                collection_name=QDRANT_COLLECTION_NAME,
                ids=[memory_id],
                with_payload=False,
                with_vectors=False,
            )
            if not results:
                raise HTTPException(status_code=404, detail="Memory not found")
        except HTTPException:
            raise
        except:
            pass  # Some IDs may be UUIDs vs ints

        client.delete(
            collection_name=QDRANT_COLLECTION_NAME,
            points_selector=models.PointIdsList(points=[memory_id])
        )

        return {"status": "success", "message": "Memory deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete memory failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== REQUEST FULFILLMENT ====================

class FulfillRequestBody(BaseModel):
    request_id: str
    patient_id: str
    content: str
    notes: Optional[str] = None

@app.post("/api/family/requests/fulfill")
def fulfill_family_request(body: FulfillRequestBody, user: dict = Depends(verify_token)):
    """Fulfill a family request by creating a memory and marking as completed."""
    try:
        client = get_client()
        from lifelens.ingestion.text_processor import process_text
        from lifelens.utils.memory_requests import update_request_status, load_requests

        # Find the request to get context
        all_requests = load_requests()
        matched_req = None
        for r in all_requests:
            if r["id"] == body.request_id:
                matched_req = r
                break

        # Create the memory
        data = process_text(body.content)
        data["patient_id"] = body.patient_id
        data["timestamp"] = int(time.time())
        data["source"] = "family_request"
        if matched_req:
            details = matched_req.get("details", {})
            if details.get("people_involved"):
                data["person_tags"] = details["people_involved"]
            if details.get("location"):
                data["location"] = {"name": details["location"]}

        upsert_memory(client, "text", data)

        # Mark request as completed
        notes = body.notes or "Memory added as text note"
        update_request_status(body.request_id, "completed", notes)

        return {"status": "success", "message": "Request fulfilled and memory added"}

    except Exception as e:
        logger.error(f"Fulfill request failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
