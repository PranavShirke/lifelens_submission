# 3D Avatar Assistant Feature Extract

This folder contains the extracted files for the full-screen Avatar Assistant flow:
- Frontend avatar/chat/camera UI
- Backend chat + Llama 3 + memory APIs
- Face/object recognition services
- Runtime assets and model files

## Included

- `app/` (all backend API and services)
- `frontend/` (full frontend app, including `public/assets/`, `public/talkinghead_lib/`, and `src/lib/talkinghead_modules/`)
- `static/`
- `requirements.txt`
- `render_build.sh`
- `README.md`
- `yolov8n.pt`
- `model.glb`

## Required Environment Variables

Set these in your `.env` file:

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `GROQ_API_KEY`
- `QDRANT_MODE` (optional, defaults to `server` in config)

## Run

Backend:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Dependency Note

Based on imports in `app/services`, you may also need these packages if they are not already present in your environment:

- `tensorflow`
- `keras-facenet`
- `scipy`

(They are imported by face/object services but are not pinned in the current `requirements.txt`.)
