# PrivEdge Backend

FastAPI backend implementing the full PrivEdge pipeline:

**Privacy/Risk Analyzer → Intelligent Router (rule-based + trained ML) → Edge AI (Ollama) / Cloud AI (Gemini) / Human Review → Response Validator → SQLite persistence**

The backend also provides JWT authentication, role-based access control (RBAC), encryption, data masking, audit logging, Knowledge Base and RAG support, file attachment processing, notifications, analytics, and admin/reviewer workflows.

---

## 1. Setup

### Create and activate the Python environment

#### Windows PowerShell

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

#### Linux / macOS

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and configure the required values.

### Environment variables

- **`GEMINI_API_KEY`** - required for the Cloud AI path. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Without it, Cloud AI requests return a friendly configuration error while the other parts of the system continue to work.

- **`GEMINI_MODEL`** - specifies the Gemini model used by the Cloud AI service.

- **`OLLAMA_BASE_URL` / `OLLAMA_MODEL`** - required for the Edge AI path. Install [Ollama](https://ollama.com), start the service, and pull the configured model. For the current project configuration:

```bash
ollama pull llama3.2:3b
```

Without Ollama running, Edge AI requests return a controlled error instead of crashing the application.

- **`JWT_SECRET`** - secret used for JWT authentication. Use a long random value for any shared or deployed environment.

- **`ENCRYPTION_KEY`** - Fernet encryption key used for protected stored data.

- **`ROUTER_MODE`** - selects the routing strategy:
  - `rule` - rule-based routing, used by default.
  - `ml` - uses the trained classifier stored in `app/ml/routing_model.joblib`.

- **Routing thresholds** such as `PRIVACY_THRESHOLD`, `RISK_THRESHOLD`, and related policy values control project-defined routing behavior and can be tuned when required.

### Optional spaCy model

The privacy analyzer works with regex and keyword detection even without the spaCy language model.

For improved Named Entity Recognition (NER):

```bash
pip install spacy
python -m spacy download en_core_web_sm
```

---

## 2. Run the Backend

Start the FastAPI server from the `backend` directory.

### Windows / Linux / macOS

```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

FastAPI automatically provides Swagger/OpenAPI documentation at this address.

---

## 3. Database Initialization

On first startup, the application automatically creates the SQLite database:

```text
privedge.db
```

The backend also performs the required additive database migrations so that existing development databases can receive newly introduced columns without requiring a full reset.

The seed process creates:

- Development Admin account
- Development Reviewer account
- Starter Knowledge Base documents used by the RAG workflow

Development seed passwords are configured through:

```text
SEED_ADMIN_PASSWORD
SEED_REVIEWER_PASSWORD
```

in `.env`.

For any shared or non-development environment, use strong credentials and change the development seed values.

---

## 4. Run the Frontend Against the Backend

From the project root, open the frontend directory:

```bash
cd ../frontend
```

If `.env.local` does not exist, create it from the example:

### Windows PowerShell

```powershell
Copy-Item .env.local.example .env.local
```

### Linux / macOS

```bash
cp .env.local.example .env.local
```

The frontend API URL should point to:

```text
VITE_API_URL=http://localhost:8000
```

Install frontend dependencies if required:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

The application supports three main authenticated roles:

- **USER**
- **REVIEWER**
- **ADMIN**



---

## 5. Three-Terminal Local Setup

For the complete local PrivEdge system, use three terminals.

### Terminal 1 — Frontend

```powershell
cd C:\Users\HP\OneDrive\Desktop\PrivEdge\frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

### Terminal 2 — Backend

```powershell
cd C:\Users\HP\OneDrive\Desktop\PrivEdge\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app
```

Backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

### Terminal 3 — Edge AI

```powershell
ollama run llama3.2:3b
```

This provides the local Edge AI service used by PrivEdge.

---

# 6. Test

## Backend tests

From the `backend` directory:

```bash
python -m pytest -q
```

Current verified result:

```text
53 passed
```

The backend test suite covers:

- Privacy and risk analysis
- Routing correctness
- Rule-based routing
- ML routing
- RBAC
- Authentication
- Conversation ownership and isolation
- Encryption at rest
- Human Review lifecycle
- Admin user management
- Admin Settings enforcement
- Auto-routing control
- Audit logging control
- Session timeout behavior
- Context window behavior
- Notification settings
- Chat file attachments
- Knowledge Base search
- RAG functionality
- API behavior
- Other backend functionality

Gemini and Ollama calls are mocked where appropriate in automated tests, so the backend test suite does not require external AI services to execute.

---

## Frontend tests

From the `frontend` directory:

```bash
npm test
```

Current verified result:

```text
34 tests passed
```

The frontend test suite uses:

- Vitest
- React Testing Library

It covers:

- Login
- Registration
- Chatbot routing display
- Human Review display
- Conversations list/search/delete
- Reviewer approve/modify/reject workflow
- Admin user management
- Admin settings
- Notification functionality

### Overall automated testing result

```text
Backend tests:   53/53 passed
Frontend tests:  34/34 passed
--------------------------------
Total:           87/87 passed
```

---

# 7. Frontend Production Build

From the `frontend` directory:

```bash
npm run build
```

The current production build has been successfully verified.

The build may report a bundle-size warning for large JavaScript chunks, but this does not prevent the production build from completing successfully.

---

# 8. ML Router

The Intelligent Router supports both:

1. Rule-based routing
2. Machine-learning-based routing

Rule-based routing is the default and does not require model training.

The trained ML model uses a Random Forest classifier.

## Generate the dataset

```bash
python -m app.ml.generate_dataset
```

This regenerates:

```text
app/ml/dataset.csv
```

The dataset is synthetic. Its labels represent the project's intended routing policy for the generated query templates rather than real production traffic.

## Train the model

```bash
python -m app.ml.train
```

The training process:

- Trains candidate classifiers
- Compares model performance
- Performs grouped evaluation
- Performs 5-fold grouped cross-validation
- Selects the best-performing model
- Saves the trained model to:

```text
app/ml/routing_model.joblib
```

## Evaluate the model

```bash
python -m app.ml.evaluate
```

This runs a separate hand-written out-of-distribution test set and produces:

```text
evaluation_report.json
```

The OOD queries are not generated from the training templates and are intended to provide a more realistic generalization check.

## Generate the ML report

```bash
python -m app.ml.make_report
```

This combines the evaluation outputs into:

```text
app/ml/ML_EVALUATION.md
```

The report is generated programmatically from the evaluation outputs rather than having the final numbers manually typed into the report.

---

# 9. ML Evaluation Summary

The current ML evaluation includes:

### 5-fold grouped cross-validation

```text
Mean macro-F1: 96.1%
Standard deviation: 4.3%
```

### Separate out-of-distribution evaluation

```text
Rule-based router: 97.1%
ML router:         91.2%
```

The OOD evaluation is intentionally separate from the training evaluation so that the project does not rely only on a near-perfect single split.

The documented misclassifications are included in:

```text
app/ml/ML_EVALUATION.md
```

---

# 10. Selecting the ML Router at Runtime

The rule-based router is the default.

To use the trained ML model, set:

```text
ROUTER_MODE=ml
```

in `.env`.

The trained model is loaded from:

```text
app/ml/routing_model.joblib
```

The ML router is still protected by safety rules. Clearly private or high-risk queries can be overridden to safer processing routes such as Edge AI or Human Review.

The ML model predicts the **processing route**:

```text
Edge AI
Cloud AI
Human Review
```

It does not select individual AI models.

---

# 11. Core PrivEdge Pipeline

The backend implements the following processing pipeline:

```text
User Query
    ↓
Privacy Analyzer
    ↓
Risk Analyzer
    ↓
Complexity Analyzer
    ↓
Feature Extraction
    ↓
Intelligent Router
    ├── Edge AI
    ├── Cloud AI
    └── Human Review
    ↓
Response Validator
    ↓
Database / Logs
    ↓
Frontend Response
```

The routing decision is based on characteristics of the query such as:

- Privacy
- Sensitivity
- Risk
- Complexity
- Latency requirements
- Other extracted routing features

---

# 12. What's Implemented

## Core Pipeline

### Privacy & Risk Analyzer

Uses:

- Regex-based detection
- Keyword categories
- Optional spaCy NER
- Privacy scoring
- Sensitivity detection
- Complexity analysis
- Risk analysis
- Latency analysis
- PII type detection
- Domain detection
- Human-review requirement detection

---

### Intelligent Router

The Intelligent Router provides:

- Rule-based routing
- Optional trained ML routing
- Random Forest classification
- Routing priority policy
- Safety guardrails
- Human Review escalation
- Edge/Cloud selection based on query characteristics

---

### Edge AI

Edge AI uses:

```text
Ollama
└── Llama 3.2 3B
```

Sensitive queries can be processed locally so that they do not need to be sent to an external cloud AI service.

---

### Cloud AI

Cloud AI uses Google Gemini.

The Cloud path supports:

- Gemini-based response generation
- Privacy-aware processing
- Masked input where applicable
- RAG context injection
- Controlled error handling when the external service is unavailable

---

### Human Review

High-risk queries can be sent to Human Review.

The workflow supports:

```text
Query
 ↓
Human Review
 ↓
Reviewer Dashboard
 ↓
Approve / Modify / Reject
 ↓
User receives the resulting response
```

---

### Response Validator

The response validator performs checks including:

- Empty response validation
- Response length checks
- Inappropriate-content blocking
- PII leakage detection/masking

---

### Chat File Attachments

The chatbot supports:

```text
.txt
.md
.pdf
```

Uploaded content is extracted and processed through the same core PrivEdge pipeline as typed queries:

```text
File
 ↓
Text extraction
 ↓
Privacy analysis
 ↓
Risk analysis
 ↓
Feature extraction
 ↓
Intelligent routing
 ↓
Edge / Cloud / Human Review
```

---

# 13. Authentication and Authorization

The backend provides:

- JWT authentication
- Password hashing with bcrypt
- Role-Based Access Control (RBAC)

Supported roles:

```text
USER
REVIEWER
ADMIN
```

Access to protected resources is controlled based on the authenticated user's role.

---

# 14. Database

The current implementation uses:

```text
SQLite
```

SQLAlchemy models are used for database interaction.

The database stores application data including:

- Users
- Conversations
- Messages
- Routing information
- Human Review requests
- Knowledge Base information
- Notifications
- Audit information
- Application settings

The backend includes a small additive migration mechanism:

```text
app/db/migrate.py
```

This allows existing development databases to receive newly required columns without requiring a complete database reset.

PostgreSQL is a possible future production database option, but SQLite is the current verified database implementation.

---

# 15. Security and Administration

## Encryption

Fernet encryption is used for protected stored message data.

## Data Masking

Sensitive information can be masked before data is passed to external cloud processing.

## Audit Logging

Administrative and system activity can be recorded through the audit logging mechanism.

Audit logging can be controlled through the corresponding Admin Setting.

## Idle Session Timeout

The application supports an administrator-configurable idle session timeout separate from the JWT expiration mechanism.

## Context Window

The administrator can configure the context window used when preparing conversation history for AI processing.

## Manual Oversight Mode

When automatic routing is disabled:

```text
Auto Route = OFF
```

requests are sent to:

```text
Human Review
```

instead of being automatically routed to Edge or Cloud AI.

## Notifications

The backend supports notification categories including:

- High-risk query notifications
- System failure notifications
- Human-review backlog notifications
- User notifications when a query has been reviewed

The corresponding notification settings control these categories.



---

# 16. Knowledge Base and RAG

PrivEdge includes a Knowledge Base and Retrieval-Augmented Generation (RAG) extension.

The Knowledge Base supports:

- Document creation
- Document viewing
- Document management
- Document search
- Content-based search
- Content matching
- Search-result highlighting
- Administrative management

Documents can be screened for sensitive content before being indexed.

The current retrieval implementation uses:

```text
TF-IDF
+
Cosine Similarity
```

The retrieved context can be injected into the Cloud AI generation path.

The overall RAG flow is:

```text
User Query
    ↓
Knowledge Base Retrieval
    ↓
Relevant Context
    ↓
Cloud AI
    ↓
Context-aware Response
```

---

# 17. Admin Features

The backend supports the application's administrative functionality, including:

- Admin Dashboard
- User Management
- Routing Analytics
- Query Logs
- Human Review Monitoring
- Knowledge Base Management
- System Monitoring
- System Settings
- Notifications
- Audit activity

System Monitoring provides visibility into the operational state of components such as:

```text
API
Database
Gemini
Ollama
RAG
```

---

# 18. Reviewer Features

The reviewer workflow supports:

- Reviewer Dashboard
- Review Queue
- Opening review requests
- Approving responses
- Modifying responses
- Rejecting responses
- Review history
- Reviewer statistics

The Human Review lifecycle is integrated with the main PrivEdge chat pipeline.

---

# 19. User Features Supported by the Backend

The backend provides API support for:

- User authentication
- Chat
- Conversations
- Conversation history
- Knowledge Base access
- RAG-assisted responses
- File attachments
- Routing information
- User analytics
- Notifications
- Human Review status

---

# 20. API Documentation

FastAPI automatically exposes interactive Swagger/OpenAPI documentation at:

```text
http://localhost:8000/docs
```

The backend API is organized around functionality such as:

```text
Authentication
Chat
Conversations
Knowledge Base
Human Review
Admin
Dashboard / Analytics
Notifications
Health / System Monitoring
```

---

# 21. Project Structure

The backend follows a modular structure:

```text
backend/
│
├── .env.example
├── README.md
├── requirements.txt
│
├── app/
│   ├── core/
│   │
│   ├── db/
│   │   ├── database.py
│   │   ├── migrate.py
│   │   ├── models.py
│   │   └── seed.py
│   │
│   ├── ml/
│   │   ├── dataset.csv
│   │   ├── generate_dataset.py
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── make_report.py
│   │   ├── routing_model.joblib
│   │   ├── metrics.json
│   │   ├── evaluation_report.json
│   │   └── ML_EVALUATION.md
│   │
│   ├── routes/
│   │
│   ├── schemas/
│   │
│   ├── security/
│   │
│   └── services/
│       ├── analytics.py
│       ├── audit.py
│       ├── chat_service.py
│       ├── cloud_ai.py
│       ├── complexity_analyzer.py
│       ├── document_extract.py
│       ├── edge_ai.py
│       ├── feature_extractor.py
│       ├── llm_errors.py
│       ├── notifications.py
│       ├── patterns.py
│       ├── policy.py
│       ├── privacy_analyzer.py
│       ├── rag_service.py
│       ├── response_validator.py
│       ├── risk_analyzer.py
│       ├── router.py
│       └── settings_store.py
│
└── tests/
```

---

# 22. Automated Test Summary

The current verified project has:

```text
Backend
53/53 tests passed

Frontend
34/34 tests passed

Total
87/87 automated tests passed
```

The frontend tests are maintained separately in the frontend project.

The backend tests focus on API behavior, routing, security, database behavior, AI pipeline components, settings enforcement, attachments, Knowledge Base functionality, RAG, and Human Review.

---

# 23. Manual End-to-End Verification

The complete application has also been manually verified through the actual running system.

The major verified workflows include:

### Cloud AI

```text
Normal query
    ↓
Cloud AI
    ↓
Response
```

### Edge AI

```text
Sensitive/private query
    ↓
Edge AI
    ↓
Ollama / Llama 3.2
    ↓
Response
```

### Human Review

```text
High-risk query
    ↓
Human Review
    ↓
Reviewer
    ↓
Approve / Modify / Reject
    ↓
User
```

### RAG

```text
Query
    ↓
Knowledge Base retrieval
    ↓
Relevant context
    ↓
Cloud AI
    ↓
Response
```

### File attachment

```text
File
    ↓
Text extraction
    ↓
Privacy/Risk analysis
    ↓
Routing
    ↓
Edge / Cloud / Human Review
```

---

# 24. Deferred Production Enhancements

The current PrivEdge implementation is focused on the final-year project functionality and verified local operation.

The following are deliberately deferred production-oriented enhancements:

- PostgreSQL production deployment
- Docker / deployment packaging
- HTTPS deployment
- Rate limiting
- Production secrets management
- Full MFA implementation
- Production-scale monitoring and infrastructure

These items are not required for the current academic implementation and can be addressed when moving the system toward a production deployment.

---

# 25. Current Implementation Status

The core PrivEdge system is implemented and verified across the major functional areas:

```text
Privacy Analysis          ✓
Risk Analysis             ✓
Complexity Analysis       ✓
Feature Extraction        ✓
Rule-based Routing        ✓
ML Routing                ✓
Edge AI                   ✓
Cloud AI                  ✓
Human Review              ✓
Response Validation       ✓
Authentication            ✓
RBAC                      ✓
Encryption                ✓
Data Masking              ✓
Audit Logging             ✓
Conversations             ✓
Knowledge Base             ✓
RAG                       ✓
File Attachments          ✓
Admin System              ✓
Reviewer System           ✓
User Analytics            ✓
Settings Enforcement      ✓
Notifications             ✓
Backend Tests              53/53 ✓
Frontend Tests             34/34 ✓
Production Build           ✓
```

The backend therefore provides the complete implementation layer for the current PrivEdge academic project.