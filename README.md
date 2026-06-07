 Climitra Field Evidence Capture System

A mobile-first, offline-capable field evidence capture system for carbon credit verification workflows in biochar-based decarbonization projects.

Frontend: https://capture-task.vercel.app/
Backend API: https://capture-task.onrender.com/

1. Setup
Frontend (React / Vercel)
Requirements
Node.js ≥ 18
npm ≥ 9
Run locally
git clone <repo-url>
cd frontend
npm install
npm run dev
Build
npm run build
Environment variables
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
Environment variables
MONGO_URI=<your_mongodb_connection>
PORT=5000
Core Services Used
OCR: Tesseract.js
LLM Extraction: Google GenAI (Gemma)
Database: MongoDB
Offline Storage: IndexedDB (Frontend)
2. Architecture Overview
High-Level Design

The system is designed as a trust pipeline, not just an OCR tool.

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
Reviewer Dashboard (Frontend)
Data Flow
1. Capture Phase
Field operator captures weighbridge / dispatch slip
Stored locally if offline (IndexedDB)
2. Sync Phase
When network is available → batch upload to backend
3. Processing Pipeline
Light image normalization
OCR extraction using Tesseract.js
LLM converts OCR text → structured JSON
Field-level confidence scoring
Duplicate detection
Stored in MongoDB with audit metadata
4. Review Phase
Reviewer views:
Original image
Extracted fields
Confidence scores
Correction history
Why This Architecture

This design prioritizes:

Offline-first reliability
Audit-grade traceability
Separation of extraction and review layers
Future scalability (queue system can be added later without redesign)
3. Key Tradeoffs
1. No async job queue vs synchronous pipeline
Rejected:

Full background job system (BullMQ / Kafka)

Why:
Adds infrastructure complexity (Redis, workers)
MVP scale does not require it
Latency is acceptable
Tradeoff:
❌ No true parallel processing
❌ Limited retry orchestration
Impact:

Designed so a queue can be added later between OCR and LLM without changing architecture.

2. Lightweight preprocessing vs full OpenCV pipeline
Rejected:

Advanced preprocessing (glare removal, perspective correction, denoising)

Why:
Requires dataset tuning
High engineering cost
Limited MVP gain
Tradeoff:
❌ Worse performance on extreme blur/tilt images
Impact:

Relies more on:

OCR baseline
LLM robustness
3. Tesseract + LLM hybrid vs LLM-only extraction
Rejected:

Direct image → LLM structured extraction

Why:
Higher hallucination risk
More expensive
Less deterministic
Tradeoff:
Slightly more pipeline complexity
Impact:

Improves:

reliability
field-level confidence grounding
4. MongoDB-only vs event-sourcing system
Rejected:

Full event-sourcing architecture

Why:
Too complex for MVP scope
Tradeoff:
❌ No perfect replay of entire system state
Impact:

Simulated via:

correction logs
field-level change history
5. No semantic/vector search
Rejected:

Vector DB + embeddings

Why:
Problem is structured (not semantic search)
Tradeoff:
❌ No fuzzy retrieval
Impact:

Used deterministic filters:

vehicle number
date
weight
4. Assumptions
Documents are mostly English weighbridge slips and dispatch challans
Vehicle numbers follow consistent format patterns
Duplicate uploads will happen due to offline sync retries
Field connectivity is intermittent or unavailable
Reviewers are trusted internal users
MongoDB is sufficient for audit-grade storage
Image quality varies (blur, tilt, dust, low light)
OCR latency of a few seconds is acceptable
5. What Breaks First at 100× Scale
1. OCR + LLM pipeline bottleneck
Problem:

Processing slows down during bulk uploads

Cause:
Tesseract + LLM are CPU/latency heavy
No async worker separation
Fix:
Introduce job queue (Redis + workers)
Separate ingestion from processing
2. MongoDB write/query pressure
Problem:

Dashboard filtering becomes slow

Cause:
growing audit logs
duplicate detection overhead
Fix:
indexing (vehicleNumber, timestamp)
partitioning by date/project
archival strategy
3. Frontend polling overhead
Problem:

Dashboard becomes inefficient

Cause:
polling-based updates
Fix:
WebSockets / event-driven updates
4. Duplicate detection slowdown
Problem:

Slower lookup with large dataset

Fix:
hashed index (vehicle + weight + time window)
caching layer
6. Handling Binding Constraints
Mobile-first capture

The system is designed as a PWA for low-end Android devices. It supports camera capture, batch uploads, and simplified UI flows optimized for field workers rather than desktop users.

Intermittent connectivity

All captures are stored first in IndexedDB (offline-first design). Uploads are synced automatically when connectivity returns, ensuring zero data loss.

Audit trail

Every record includes:

raw OCR output
LLM structured output
reviewer corrections
timestamped field-level change history
userId for all actions

This enables full reconstruction of every value for audit and compliance purposes.

Visible confidence

Each field includes:

OCR confidence score
LLM confidence alignment score
human override flag

Low-confidence fields are visually highlighted to guide reviewer attention.

7. Conclusion

This system is designed as a trust layer for carbon credit MRV workflows, not just an OCR tool.

It prioritizes:

traceability over automation
correctness over speed
auditability over simplicity
controlled uncertainty over false confidence
Core Principle

The system does not just extract data — it preserves evidence integrity across capture, extraction, correction, and verification stages.