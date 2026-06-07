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
Core services used
OCR: Tesseract.js
LLM Extraction: Google GenAI (Gemma)
Storage: MongoDB
Offline storage: IndexedDB (frontend)
2. Architecture Overview
High-level design

The system is designed as a trust pipeline, not just an OCR tool.

Mobile PWA (Frontend)
        ↓
IndexedDB (Offline buffer)
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
When network is available → batch upload
3. Processing Pipeline
Image normalization (light preprocessing only)
OCR extraction via Tesseract
LLM converts OCR text → structured JSON
Confidence scoring per field
Duplicate detection check
Stored in MongoDB with audit metadata
4. Review Phase
Reviewer sees:
original image
extracted fields
confidence scores
correction history
Why this shape

This architecture prioritizes:

Offline-first capture reliability
Audit-grade traceability
Separation of extraction and verification layers
Future extensibility (queue system can be added later without redesign)
3. Key Tradeoffs
1. No full async job queue (BullMQ/Kafka) vs synchronous pipeline
Rejected option:
Full background job queue system
Why rejected:
Adds infra complexity (Redis, workers, orchestration)
Current load is small and predictable
Latency is acceptable for MVP
What we gave up:
True parallel processing at scale
Retry orchestration guarantees
Impact:

System is currently synchronous but designed in a way that a queue can be inserted between OCR and LLM without structural changes.

2. Lightweight preprocessing vs full OpenCV pipeline
Rejected:
Perspective correction + glare removal + advanced denoising pipeline
Why:
Dataset-specific tuning required
High engineering cost for marginal MVP gain
What we gave up:
Better accuracy on extreme blur/tilt cases
Impact:

We rely on:

basic normalization
LLM robustness instead of image-heavy correction
3. Tesseract + LLM hybrid vs LLM-only extraction
Rejected:
Direct image → LLM structured extraction
Why:
Cost + hallucination risk
OCR provides deterministic grounding
What we gave up:
End-to-end simplicity
Impact:

Hybrid system improves:

reliability
field-level confidence grounding
4. MongoDB-only storage vs event-sourcing system
Rejected:
full event sourcing architecture
Why:
complexity not justified for MVP scale
What we gave up:
perfect reconstruction of system state over time
Impact:

We still simulate auditability using:

correction logs
field-level history tracking
5. No semantic/vector search
Rejected:
embeddings + vector DB
Why:
problem is structured data, not semantic retrieval
What we gave up:
fuzzy document retrieval
Impact:

Search is deterministic (vehicle number, date, weight filters), which is sufficient for audit workflows.

4. Assumptions
Field documents are mostly English weighbridge slips and dispatch challans
Vehicle numbers follow standard formats (state + alphanumeric)
Operators may re-upload same document due to offline retries
Network connectivity is unreliable or intermittent in field locations
Reviewers are trusted internal users (not adversarial actors)
MongoDB is sufficient for audit-scale traceability (no regulatory blockchain requirement)
Image quality varies widely (blur, tilt, dust, low light)
Latency of a few seconds in OCR is acceptable in workflow
5. What breaks first at 100x scale
1. OCR + LLM synchronous bottleneck
Failure mode:
Processing queue becomes slow under batch uploads
Why:
Tesseract + LLM calls are CPU/latency heavy
No async worker separation yet
Fix:
Introduce job queue (BullMQ / Redis workers)
Separate ingestion from processing
2. MongoDB write + query pressure
Failure mode:
slow reviewer dashboard filtering
Why:
duplicate detection + audit logs increase write size
Fix:
indexing (vehicleNumber, timestamp)
partitioning by date/project
archival strategy for older data
3. Frontend polling inefficiency
Failure mode:
dashboard refresh becomes expensive
Why:
current polling-based update model
Fix:
WebSockets or event-driven updates
4. Duplicate detection lookup cost
Failure mode:
slows with large historical dataset
Fix:
precomputed hash index (vehicle + weight + time bucket)
caching layer
6. Handling Binding Constraints
Mobile-first capture

The frontend is a PWA optimized for low-end Android devices. It supports camera-based capture and batch uploads. UI is simplified for field usage rather than desktop workflows. This ensures usability in non-ideal field environments.

Intermittent connectivity

All captures are first stored in IndexedDB locally. Uploads are deferred until connectivity is restored. Sync is automatic and retry-based. This prevents data loss even in complete offline scenarios.

Audit trail

Every record stores:

raw OCR output
LLM structured output
reviewer corrections
timestamped field-level changes
userId for every capture and correction

This ensures full reconstruction of how any value was derived, which is critical for carbon credit verification audits.

Visible confidence

Each extracted field carries:

OCR confidence score
LLM alignment confidence
human override flag

The UI highlights low-confidence fields explicitly so reviewers focus attention where uncertainty is highest. This avoids false trust and improves review efficiency.

7. Conclusion

This system is designed as a trust pipeline for carbon credit MRV workflows, not just an OCR extraction tool.

It prioritizes:

traceability over automation
correctness over speed
auditability over simplicity
controlled uncertainty over false confidence

The core principle:

The system does not just extract data — it preserves evidence integrity across extraction, correction, and verification stages.