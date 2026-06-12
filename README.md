# LifeLens: AI-Powered Proactive Memory Care Ecosystem
### Submission for AMD

> **Bridging the gap between memory loss and meaningful connection.**

LifeLens is a sophisticated, agentic AI ecosystem designed to support individuals with cognitive impairments (such as Alzheimer's or Dementia) and their care networks. Unlike passive storage apps, LifeLens is a **proactive companion** that captures memories, monitors behavioral health, and alerts caregivers in real-time.

---

## 🌟 The USPs (Unique Selling Points)

To the Jury: These are the two primary innovations that distinguish LifeLens from any existing solution.

### 1. Agentic Reasoning Engine (Powered by LangGraph)
Most AI assistants are just chatbots. **LifeLens uses a Multi-Agent Orchestrator.** When a user asks a question like *"When was the last time my grandson visited?"*, the system triggers a self-correcting loop:
- **Planner**: Deconstructs the question into search parameters.
- **Retriever**: Performs semantic search across the Qdrant Vector database.
- **Executor**: Synthesizes a grounded answer using retrieved evidence.
- **Critic**: Fact-checks the answer for hallucinations. If it's not 100% accurate, it restarts the loop.
**Result**: Highly reliable, evidence-backed answers for vulnerable users.

### 2. Proactive Safety Triggers (NTFY + AI Monitoring)
LifeLens doesn't wait for you to check the app. It **pushes the care to you**.
- **Behavioral Triggers**: Using AI agents, the system detects anomalies (e.g., "No memories captured for 48 hours" or "Sustained mood decline").
- **Real-Time Push**: Integrated with **NTFY**, the system pushes instant high-priority alerts to the caregiver’s phone for missed medications, urgent mood shifts, or inactivity.
**Result**: A "safety net" that allows patients to live independently longer while giving families peace of mind.

---

## 🛠 Feature Ecosystem

### 🧠 Patient Experience: The Cognitive Mirror
- **Holographic 3D Avatar**: A warm, interactive assistant that speaks and listens, giving the AI a human face.
- **Multi-Modal Capture**: Effortlessly save moments via Voice, Photo (Webcam/Mobile), or Text.
- **AI Memory Lane**: A semantic timeline that categorizes the user's life into meaningful milestones and achievements automatically.
- **Contextual HUD**: A wearable AR-style interface (Web/Mobile) that provides real-time status on health and environment.

### 🏠 Family Portal: Closing the Distance
- **AI Recap Panels**: Weekly and daily sentiment summaries generated from the patient's interactions.
- **Memory Requests**: Family members can request specific memories (e.g., *"Dad, tell us about your first car"*), which appear as interactive tasks for the patient.
- **Lazy-Loading Gallery**: A real-time visual history of recent photo memories captured by the patient.

### 🩺 Caretaker Dashboard: Clinical Insights
- **Mood Analytics**: 90-day sentiment trend visualization using AI scoring.
- **Medication Adherence**: A robust tracking system that logs doses and triggers NTFY alerts for skipped or missed medications.
- **Active Triggers Panel**: A live feed of AI-detected risks requiring attention.

---

## 🏗 Technology Stack

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion (Animations), Three.js (3D Avatar).
- **Backend**: FastAPI (Python), LangGraph (Agentic Orchestration).
- **Intelligence**: Google Gemini 1.5 Pro (Reasoning), Gemini-Embedding-001 (Vectors).
- **Storage**: Qdrant Cloud (Vector Database), JSON (Metadata Persistence).
- **Real-time**: NTFY (Push Notifications).

---

## 🚀 Quick Start for the Jury

### 1. Requirements
- Node.js 18+
- Python 3.10+
- Gemini API Key

### 2. Environment Setup
Create a `.env` file in the `backend/lifelens` directory:
```env
GEMINI_API_KEY=your_key_here
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
NTFY_TOPIC_URL=https://ntfy.sh/your-private-topic
```

### 3. Installation
**Backend**:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn lifelens.api.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### 4. The "Wow" Demo Path
1.  **Step 1**: Open the **Patient Dashboard**. Use the **3D Assistant** to ask "Who is John?". Watch the LangGraph agent retrieve evidence.
2.  **Step 2**: Mark a medication as "Skipped" on the **Caretaker Dashboard**. Show the **NTFY notification** appearing on your phone/browser.
3.  **Step 3**: View the **Family Portal** and see the 90-day mood trend—showing how AI tracks emotional well-being over time.

---

## 📜 Future Roadmap
- **Wearable Integration**: Direct sync with Meta Glasses for hands-free memory capture.
- **Biometric Integration**: Heart-rate and sleep data mapping against mood trends.
- **Multi-Lingual Support**: Native support for elderly users speaking in their mother tongue.

---
*Created with ❤️ for the future of compassionate care.*
