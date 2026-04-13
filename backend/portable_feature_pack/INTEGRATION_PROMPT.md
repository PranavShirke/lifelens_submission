# Prompt To Give Another AI In Your New Project

Use this prompt after you paste this folder into another project:

---
Integrate the feature pack from ./portable_feature_pack into this codebase.

Requirements:
1. Backend
- Merge files from portable_feature_pack/backend/app into the backend app package.
- Register router from app.api.endpoints in the existing FastAPI app using prefix /api/v1.
- Install dependencies from portable_feature_pack/backend/requirements.feature-pack.txt.
- Configure environment variables from portable_feature_pack/backend/.env.example.
- Keep existing APIs working; do not break current routes.
- Ensure these routes work end-to-end:
  - POST /api/v1/remember/person
  - POST /api/v1/recognize/person
  - POST /api/v1/remember/object
  - POST /api/v1/find/object

2. Frontend
- Integrate components from portable_feature_pack/frontend/src/components.
- Create or wire a dedicated caregiver route/page at /remember/person using CaregiverDashboard.
- Wire camera capture + enrollment flow to backend APIs.
- Support uploading a voice sample during person enrollment.

3. Behavior
- On person recognition, return and optionally play stored voice sample.
- On object find, identify known object and return notes/location fields.
- Preserve project coding style and existing architecture.

4. Validation
- Add/update tests for enrollment + recognition/object flows.
- Run lint/tests and fix integration errors.

Return:
- A concise changelog
- List of modified files
- Any follow-up setup commands
---
