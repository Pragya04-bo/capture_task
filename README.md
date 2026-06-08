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
 <img width="652" height="907" alt="image" src="https://github.com/user-attachments/assets/29a9b29d-f876-44bb-87e6-15be824cd986" />
<img width="642" height="743" alt="image" src="https://github.com/user-attachments/assets/d67de498-4208-4505-b0e3-cc6dc7f8a58e" />



2 <img width="895" height="355" alt="deligh-1-1-35" src="https://github.com/user-attachments/assets/06cd6559-f5d8-4683-8402-a125a01a26a8" />
 <img width="645" height="898" alt="image" src="https://github.com/user-attachments/assets/cd5e6874-08e2-4836-9b80-bc4f16a815da" />
 <img width="626" height="347" alt="image" src="https://github.com/user-attachments/assets/553ed846-0982-49ba-9e61-8237397f57c6" />


4. System Decision
Status: needs_review
Reason:

Faded printer ink caused low confidence markers (<50%) on both weight channels.

Mathematical validation verification failed (23915 - 1580 !== 805).





<img width="912" height="518" alt="image" src="https://github.com/user-attachments/assets/d6485fd3-4fe7-40e7-ab89-aa045f2fc1ec" />
 <img width="617" height="821" alt="image" src="https://github.com/user-attachments/assets/b2299623-a9be-4223-9b72-7d4145ae2573" />
 <img width="612" height="205" alt="image" src="https://github.com/user-attachments/assets/cc588439-1ef8-4a77-9ba5-35640fad976e" />





 
4.<img width="1144" height="1794" alt="watermark" src="https://github.com/user-attachments/assets/1ffb53e4-83b9-4f57-a7da-94e5dc09f613" />
 <img width="921" height="388" alt="image" src="https://github.com/user-attachments/assets/a13f4534-c012-4500-8fee-e4221227e2db" />
 <img width="1382" height="325" alt="image" src="https://github.com/user-attachments/assets/b5dd7a6f-9141-4f2f-93a0-414767a07b80" />



 

System Decision
Status: Needs Review
Reason:

Handwriting Failure: Standard document OCR engines are trained on printed text. They fail completely on heavy cursive handwriting, interpreting swooping pen strokes as slashes (/), parentheses, or random letters.

Watermark Interference: The giant "Northern Ireland Community Archive" watermark physically overlaps the handwritten data columns, destroying pixel continuity for the OCR.

Schema & Unit Mismatch (Out of Scope): Even if the AI could read the cursive, this receipt uses an archaic tripartite Imperial weight system (Cwts = Hundredweights, Qrs = Quarters, Lbs = Pounds) written across a grid, whereas your JSON schema expects a single concatenated integer (like Kgs). The system correctly aborts rather than guessing how to parse 24 Cwts, 2 Qrs, 7 Lbs.
