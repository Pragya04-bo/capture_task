 # Climitra Field Evidence Capture System

A mobile-first, offline-capable field evidence capture system for carbon credit verification workflows in biochar-based decarbonization projects.

---

## 🔗 Links

- Frontend: https://capture-task.vercel.app/
- Backend API: https://capture-task.onrender.com/

---

## 1. Setup

### Frontend (React / Vercel)

#### Requirements
- Node.js ≥ 18
- npm ≥ 9

#### Run locally
```bash
git clone <repo-url>
cd frontend
npm install
npm run dev




Build
npm run build
Environment Variables
VITE_API_BASE_URL=https://capture-task.onrender.com
Backend (Node.js / Express / Render)
Requirements
Node.js ≥ 18
MongoDB Atlas / local MongoDB
Run locally
git clone <repo-url>
cd backend
npm install
npm run dev
Production start
npm start
Environment Variables
MONGO_URI=<your_mongodb_connection>
PORT=5000
2. Core Services Used
OCR: Tesseract.js
LLM Extraction: Google GenAI (Gemma)
Database: MongoDB
Offline Storage: IndexedDB (Frontend)
3. Architecture Overview
High-Level Design

Mobile PWA (Frontend)
↓
IndexedDB (Offline Buffer)
↓ sync
Express API (Backend)
↓
OCR Layer (Tesseract.js)
↓
LLM Structuring Layer (Gemma)
↓
Validation + Confidence Engine
↓
MongoDB (Audit-grade storage)
↓
Reviewer Dashboard

4. Key Tradeoffs
1. No async job queue
Simpler MVP
No Redis / workers
Easier deployment
2. Lightweight preprocessing
No OpenCV pipeline
Faster development
3. OCR + LLM hybrid
More reliable than LLM-only
Lower hallucination risk
4. MongoDB-only storage
No event sourcing complexity
5. No vector search
Problem is structured, not semantic
5. Assumptions
English weighbridge documents
Intermittent connectivity
Duplicate uploads expected
Moderate image quality variation
Internal trusted reviewers
6. What Breaks at Scale
OCR/LLM bottleneck → needs queue system
MongoDB slow queries → indexing required
Polling issues → WebSockets needed
Duplicate detection slowdown → caching/hashing
7. Offline-First Design
IndexedDB stores captures offline
Auto sync when network returns
Zero data loss guarantee
8. Audit Trail

Each record includes:

Raw OCR output
Structured LLM output
Human corrections
Field-level history
Timestamp + userId
9. Core Principle

This system is designed for auditability over automation.

It preserves:

evidence integrity
traceability
controlled uncertainty