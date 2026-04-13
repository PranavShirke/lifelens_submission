# Portable Feature Pack: Face, Object, Voice

This folder contains reusable code extracted from this project for:
1. Face Recognition + Enrollment
2. Object Enrollment + Detection/Find
3. Voice sample storage and playback flow

## Folder Layout
- backend/app/api/endpoints.py: FastAPI routes for remember/recognize/find workflows.
- backend/app/services/face_service.py: Face detection + FaceNet embeddings.
- backend/app/services/object_service.py: YOLO detection + MobileNet embeddings.
- backend/app/services/memory_service.py: Qdrant collections + vector search.
- backend/app/services/avatar_service.py: Avatar generation from enrolled photo.
- backend/app/services/voice_service.py: Whisper transcription service.
- backend/app/services/tts_service.py: Edge TTS playback service.
- backend/tests/: Basic API flow tests copied from source project.
- backend/yolov8n.pt: YOLO model file copied for object detection.
- frontend/src/components/CameraView.jsx: Camera capture UI.
- frontend/src/components/EnrollmentForm.jsx: Person/object enrollment UI.
- frontend/src/components/AudioRecorder.jsx: Voice sample recording UI.
- frontend/src/pages/CaregiverDashboard.jsx: Caregiver enrollment dashboard.

## How To Use In Another Project
1. Copy this entire folder into your target project.
2. Copy backend/app/** files into your target backend package (matching import paths).
3. Include router from backend/app/api/endpoints.py in your FastAPI app:
   - from app.api.endpoints import router as memory_router
   - app.include_router(memory_router, prefix="/api/v1")
4. Install backend deps from backend/requirements.feature-pack.txt.
5. Configure environment variables using backend/.env.example.
6. Ensure Qdrant is running and reachable.
7. For frontend, copy the components/pages and wire APIs to:
   - POST /api/v1/remember/person
   - POST /api/v1/recognize/person
   - POST /api/v1/remember/object
   - POST /api/v1/find/object

## API Endpoints Included
- POST /recognize/person
- POST /remember/person
- POST /remember/patient
- POST /remember/object
- POST /find/object
- GET /debug/names

## Notes
- Voice cloning in this codebase is implemented as voice sample storage and playback (audio_base64), not full neural voice cloning.
- If you need actual voice cloning (speaker-conditioned TTS), add a separate model/service (for example Coqui XTTS/YourTTS) and store speaker embeddings per person.
