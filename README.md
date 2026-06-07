 # Climitra Field Evidence Capture System

A mobile-first, offline-capable field evidence capture system for carbon credit verification workflows in biochar-based decarbonization projects.

---

## 🔗 Links

- Frontend: https://capture-task.vercel.app/
- Backend API: https://capture-task.onrender.com/

---

# 1. Setup

## Frontend (React / Vercel)

### Requirements

- Node.js ≥ 18
- npm ≥ 9

### Run Locally

```bash
git clone <repo-url>
cd frontend
npm install
npm run dev
```

### Production Start

```bash
npm start
```

### Build

```bash
npm run build
```

### Environment Variables

```env
VITE_API_BASE_URL=https://capture-task.onrender.com
```

---

## Backend (Node.js / Express / Render)

### Requirements

- Node.js ≥ 18
- MongoDB Atlas or Local MongoDB

### Run Locally

```bash
git clone <repo-url>
cd backend
npm install
npm run dev
```

### Production Start

```bash
npm start
```

### Environment Variables

```env
MONGO_URI=<your_mongodb_connection>
PORT=5000
```

---

# 2. Core Services Used

| Service | Technology |
|----------|------------|
| OCR | Tesseract.js |
| LLM Extraction | Google GenAI (Gemma) |
| Database | MongoDB |
| Offline Storage | IndexedDB |

---

# 3. Architecture Overview

## High-Level Design

```text
Mobile PWA (Frontend)
        │
        ▼
IndexedDB (Offline Buffer)
        │
      Sync
        ▼
Express API (Backend)
        │
        ▼
OCR Layer (Tesseract.js)
        │
        ▼
LLM Structuring Layer (Gemma)
        │
        ▼
Validation & Confidence Engine
        │
        ▼
MongoDB (Audit-grade Storage)
        │
        ▼
Reviewer Dashboard
```

---

# 4. Key Tradeoffs

### 1. No Async Job Queue

- Simpler MVP architecture
- No Redis or worker infrastructure
- Easier deployment and maintenance

### 2. Lightweight Preprocessing

- No OpenCV pipeline
- Faster implementation
- Lower operational complexity

### 3. OCR + LLM Hybrid Approach

- More reliable than LLM-only extraction
- Reduced hallucination risk
- Better structured data quality

### 4. MongoDB-Only Storage

- Simpler data model
- Reduced infrastructure overhead
- Easier scaling for MVP requirements

### 5. No Vector Search

- Problem domain is structured rather than semantic
- Avoids unnecessary complexity

---

# 5. Assumptions

- Documents are English-language weighbridge records
- Users experience intermittent connectivity
- Duplicate uploads are expected
- Moderate image quality variations are acceptable
- Reviewers are trusted internal users

---

# 6. What Breaks at Scale

| Area | Scaling Challenge | Recommended Solution |
|--------|------------------|----------------------|
| OCR / LLM Processing | High processing latency | Job queue + workers |
| MongoDB Queries | Query performance degradation | Proper indexing |
| Client Polling | Increased network overhead | WebSockets |
| Duplicate Detection | Slower matching | Hashing + caching |

---

# 7. Offline-First Design

The application is designed to operate in low-connectivity environments.

### Features

- IndexedDB stores captures locally
- Automatic synchronization when connectivity returns
- Prevents data loss during offline operation
- Seamless user experience in the field

---

# 8. Audit Trail

Each evidence record preserves:

- Raw OCR output
- Structured LLM output
- Human corrections
- Field-level change history
- Timestamp metadata
- User identification data

This ensures complete traceability and auditability.

---

# 9. Core Principle

> This system is designed for **auditability over automation**.

It prioritizes:

- Evidence integrity
- Traceability
- Controlled uncertainty
- Human review and oversight

# Sample test

<img width="1200" height="521" alt="EdYJ7x-WoAAUHZQ" src="https://github.com/user-attachments/assets/a2cc2cfb-847a-498d-88f0-ce6abacddb1a" />
