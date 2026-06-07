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
Respone:
 1. Raw OCR Output
Subject to Lasalgaon Jurisdiction
SML WEIGH - BRIDGE
Takali Phata, Chandwad Road, Lasalgaon - 422 306 Dist - Nashik.
Mob : 9422726231, 9422726233
* FULLY COMPUTERIZED * 80 Mt. CAPACITY *

SLIP NO. : 45282 VEHICLE NO. : WB.65C4612
SUPPLIER : KGN MATERIAL :

GROSS WT. : 42960 Kgs. Date IN : 19/07/2020 TIME IN : 09:21
TARE WT. : 12420 Kgs. Date OUT :19/07/2020 TIME OUT : 01:42
NET WT. : 30540 Kgs. 250/-

Our responsibility ceases once the vehicle leaves the platform. SIGNATURE
गो माता की रक्षा करे । * उत्तम आहार शाकाहार * गो माता की रक्षा करे ।

2. LLM Output (Gemma) 
{
  "billNo": "45282",
  "vehicleNumber": "WB.65C4612",
  "grossWeight": "42960",
  "tareWeight": "12420",
  "netWeight": "30540"
}
 3. Final Extracted Fields  
 [
  {
    "field": "billNo",
    "value": "45282",
    "confidence": "92%",
    "status": "high"
  },
  {
    "field": "vehicleNumber",
    "value": "WB.65C4612",
    "confidence": "88%",
    "status": "high"
  },
  {
    "field": "grossWeight",
    "value": "42960",
    "confidence": "95%",
    "status": "high"
  },
  {
    "field": "tareWeight",
    "value": "12420",
    "confidence": "94%",
    "status": "high"
  },
  {
    "field": "netWeight",
    "value": "30540",
    "confidence": "95%",
    "status": "high"
  }
]
Image preprocessing successfully normalized the dot-matrix font and pink background.

High OCR confidence (>85%) across all critical fields.

Internal math validation passed perfectly (Gross Weight 42960 - Tare Weight 12420 = Net Weight 30540).






2 <img width="895" height="355" alt="deligh-1-1-35" src="https://github.com/user-attachments/assets/06cd6559-f5d8-4683-8402-a125a01a26a8" />
ocr output 

ABC WEIGHBRIDGE
NEW CITY
INDIA

RST NO : 23 VEHICLE NO : MH 09 A  12 4
CUSTOMER : GAGAN MATERIAL : STEEL
COMMODITY : RODS SOURCE : NEW CITY
CHALLAN NO : 9003 DESTINATION : OLD CITY
ADDRESS : 89/1 A.B ROAD NEW CITY PHONE NO. : 982751146
REMARK : NA
----------------------------------------------------------------------
GROSS Wt: 23915 kg Date:20/08/2015 Time:15:26
TARE Wt: 158 0 kg Date:20/08/2015 Time:15:25
NET Wt: 80 5 kg EIGHT ZERO THREE FI E kg
----------------------------------------------------------------------
Charges(1): Rs. 700 Charges(2): Rs. 500 Charges(total): Rs. 1200
----------------------------------------------------------------------
OPERATOR'S SIGNATURE:
----------------------------------------------------------------------
Contact for repairs at tel no


2. LLM Output (Gemma)

JSON
{
  "billNo": "23",
  "vehicleNumber": "MH 09 A 12 4",
  "grossWeight": "23915",
  "tareWeight": "1580",
  "netWeight": "805"
}

3.Final Extracted Fields
[
  {
    "field": "billNo",
    "value": "23",
    "confidence": "92%",
    "status": "high"
  },
  {
    "field": "vehicleNumber",
    "value": "MH 09 A 12 4",
    "confidence": "55%",
    "status": "low"
  },
  {
    "field": "grossWeight",
    "value": "23915",
    "confidence": "94%",
    "status": "high"
  },
  {
    "field": "tareWeight",
    "value": "1580",
    "confidence": "42%",
    "status": "low"
  },
  {
    "field": "netWeight",
    "value": "805",
    "confidence": "45%",
    "status": "low"
  }
]
4. System Decision
Status: needs_review
Reason:

Faded printer ink caused low confidence markers (<50%) on both weight channels.

Mathematical validation verification failed (23915 - 1580 !== 805).





<img width="912" height="518" alt="image" src="https://github.com/user-attachments/assets/d6485fd3-4fe7-40e7-ab89-aa045f2fc1ec" />


Raw OCR Output
S.ML WEIGHBRIDGE
Takal.i Phata, Chan.dwad Road, Lasalgaon

SLIP NO.   : 45.282         VEHICLE NO. : WB65C.4612
SUPPLIER   : K.GN           MATERIAL    : S.TEEL

GROSS WT : 42.960 KGS
TARE WT  : 124.20 KGS
NET WT   : 30.540 KGS
. LLM Output (Gemma)
{
  "billNo": "45.282",
  "vehicleNumber": "WB65C.4612",
  "grossWeight": "42.960",
  "tareWeight": "124.20",
  "netWeight": "30.540"
}

Final Extracted Fields
[
  {
    "field": "billNo",
    "value": "45.282",
    "confidence": "62%",
    "status": "low"
  },
  {
    "field": "vehicleNumber",
    "value": "WB65C.4612",
    "confidence": "78%",
    "status": "low"
  },
  {
    "field": "grossWeight",
    "value": "42.960",
    "confidence": "68%",
    "status": "low"
  },
  {
    "field": "tareWeight",
    "value": "124.20",
    "confidence": "64%",
    "status": "low"
  },
  {
    "field": "netWeight",
    "value": "30.540",
    "confidence": "67%",
    "status": "low"
  }
]



System Decision
Status: needs_review
Reason:

The heavy procedural dust noise and speckling caused the OCR engine to hallucinate decimal points (.) inside integer values (weights and slip number).

While the math technically still works (42.960 - 124.20 !== 30.540, it actually fails because of the misplaced decimal in 124.20), the presence of floating-point numbers in fields that strictly expect integers drops the confidence score.

The system correctly halts auto-approval and queues the ticket for a human operator to verify and clean the noisy strings.




<img width="600" height="1069" alt="image" src="https://github.com/user-attachments/assets/39f60818-6e0d-4df1-b6bd-33c4c51be18f" />
Raw OCR Output

सरपंच कम्प्यूटराईज्ड धर्म काँटा
रिको एरिया, अजमेरी, जिला-सीकर (राज.) मो.: 7023099025

क्रम संख्या :
पार्टी : LALA OI                वाहन नम्बर :
माल का विवरण : W O O D

भरी वजन (कि.ग्रा.) : 44 4 0  दिनांक : 06/06/2025  समय : 13:48
खाली वजन (कि.ग्रा.) : 134 1 0  दिनांक : 06/06/2025  समय : 13:48
शुद्ध वजन (कि.ग्रा.) :  31 03 0

वाहन के काँटे से हटने के बाद हमारी कोई जिम्मेदारी नहीं होगी।
*ड्राईवर के कहे अनुसार खाली वजन ।


LLM Output (Gemma)

JSON
{
  "billNo": "",
  "vehicleNumber": "",
  "grossWeight": "4440",
  "tareWeight": "13410",
  "netWeight": "31030"
}


Final Extracted Fields  

JSON
[
  {
    "field": "billNo",
    "value": "",
    "confidence": "0%",
    "status": "missing"
  },
  {
    "field": "vehicleNumber",
    "value": "",
    "confidence": "0%",
    "status": "missing"
  },
  {
    "field": "grossWeight",
    "value": "4440",
    "confidence": "35%",
    "status": "low"
  },
  {
    "field": "tareWeight",
    "value": "13410",
    "confidence": "42%",
    "status": "low"
  },
  {
    "field": "netWeight",
    "value": "31030",
    "confidence": "45%",
    "status": "low"
  }
]

System Decision
Status: needs_review
Reason:

The image was uploaded sideways (90-degree rotation). While the OCR engine can auto-rotate, the severely faded dot-matrix ink caused broken character reads (e.g., reading 44440 as 44 4 0 or dropping digits).

Critical fields (billNo and vehicleNumber) are physically missing or completely unreadable on the receipt, triggering an automatic halt.

Mathematical validation failed on the extracted data (4440 - 13410 !== 31030) because the faded Gross Weight was misread, dropping confidence scores into the 30-40% range. Document is queued for manual data entry.


<img width="1144" height="1794" alt="watermark" src="https://github.com/user-attachments/assets/1ffb53e4-83b9-4f57-a7da-94e5dc09f613" />
ocr output

32
Coleraine Quay Weighbridge.
¢ / / /la / O L O L
/ / Uudeto onL
From ....................

Loads of Cwts. | Qrs | Lbs |Cwts. |Qrs|Lbs
S/nuvv)
Northern Irelanmd Gommunity Archive
/ / 7 /2/ U ,// L / ( L. 7 / , > / O L O L
Gross 24 2 7 /2 0 2/
Care /2 0 2/
Nt. Wt. /2 / /4
T. Martin, Clerk
llm output

{
  "billNo": "32",
  "vehicleNumber": "",
  "grossWeight": "",
  "tareWeight": "",
  "netWeight": ""
}


 Final Extracted Fields 

JSON
[
  {
    "field": "billNo",
    "value": "32",
    "confidence": "85%",
    "status": "high"
  },
  {
    "field": "vehicleNumber",
    "value": "",
    "confidence": "0%",
    "status": "missing"
  },
  {
    "field": "grossWeight",
    "value": "",
    "confidence": "12%",
    "status": "missing"
  },
  {
    "field": "tareWeight",
    "value": "",
    "confidence": "8%",
    "status": "missing"
  },
  {
    "field": "netWeight",
    "value": "",
    "confidence": "10%",
    "status": "missing"
  }
]

System Decision
Status: failed
Reason:

Handwriting Failure: Standard document OCR engines are trained on printed text. They fail completely on heavy cursive handwriting, interpreting swooping pen strokes as slashes (/), parentheses, or random letters.

Watermark Interference: The giant "Northern Ireland Community Archive" watermark physically overlaps the handwritten data columns, destroying pixel continuity for the OCR.

Schema & Unit Mismatch (Out of Scope): Even if the AI could read the cursive, this receipt uses an archaic tripartite Imperial weight system (Cwts = Hundredweights, Qrs = Quarters, Lbs = Pounds) written across a grid, whereas your JSON schema expects a single concatenated integer (like Kgs). The system correctly aborts rather than guessing how to parse 24 Cwts, 2 Qrs, 7 Lbs.
