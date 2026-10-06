"""First-run seed: admin + reviewer accounts and starter knowledge documents."""
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import KnowledgeDocument, User
from app.security.auth import hash_password

DOCS = [
    ("PrivEdge User Guide", "Guide", "Complete guide to using PrivEdge, including chatbot, conversations, and privacy features.", """PrivEdge is a privacy-aware, risk-aware conversational AI. You simply ask a question in the AI Assistant; you never choose the processing path yourself.

Before answering, PrivEdge analyzes your query for privacy, sensitivity, complexity, risk and latency needs. An Intelligent Router then picks one of three paths: Edge AI (a local model on the PrivEdge server), Cloud AI (a powerful cloud model) or Human Review (a qualified reviewer).

Each answer shows a route badge: Processed by Edge AI, Processed by Cloud AI, or Human Review Required. Expand the PrivEdge Decision card under an answer to see the levels and the reason for the route.

Conversations: every chat is saved under Conversations where you can search, filter by route, reopen or delete it. Human Review: if your question is high-risk it is sent to a reviewer. You will see 'Human review is required. Your request has been sent for review.' The final reviewed answer appears in the same conversation once the reviewer decides."""),
    ("Troubleshooting Guide", "Support", "Common issues and solutions for PrivEdge users and administrators.", """Problem: 'Edge AI (Ollama) is not running'. Start Ollama on the server machine and make sure the configured model has been pulled, for example: ollama pull llama3.2:3b.

Problem: 'Cloud AI is not configured'. An administrator must set GEMINI_API_KEY in the backend .env file and restart the backend.

Problem: My question is waiting for Human Review. High-risk questions, such as medical, legal or high-stakes decisions, are reviewed by a person before you get an answer. Check the Conversations page; the status changes from Under Review to Reviewed.

Problem: I cannot log in. Check your email and password. Inactive accounts are blocked and must be re-activated by an administrator. Tokens expire after a set time; log in again.

Problem: Login works but pages show 401. Your session token expired. Sign out and sign in again."""),
    ("Security Documentation", "Security", "Security architecture, encryption standards, and compliance information.", """PrivEdge security layers: HTTPS in deployment, JWT authentication, role-based authorization (USER, REVIEWER, ADMIN), input validation, data masking, encryption of stored conversation text, and audit logging.

Passwords are stored only as bcrypt hashes; plain-text passwords are never stored. Conversation messages and responses are encrypted at rest with Fernet from the cryptography library.

Privacy routing: queries with high privacy or sensitivity scores are processed by the local Edge AI so the raw data is not sent to the cloud. Anything that does go to the cloud is masked first, for example an email becomes [EMAIL]. Masking is a secondary protection; local Edge processing is the strongest path.

Reviewers only see masked query text. Administrators see routing scores and metadata in Query Logs, not message content. Every important action is written to the audit log."""),
    ("Frequently Asked Questions", "FAQ", "Answers to the most common questions about PrivEdge functionality and routing.", """How does PrivEdge decide where to route a query? It computes privacy, sensitivity, complexity, risk, latency and human-requirement features. Policy priority: human-required or high risk goes to Human Review; high privacy or sensitivity goes to Edge AI; a fast simple request can use Edge AI; everything else goes to Cloud AI.

What is the difference between Edge AI and Cloud AI? Edge AI runs a smaller local model on the PrivEdge server, keeping sensitive data local. Cloud AI uses a more powerful Gemini model and is used for general or complex low-sensitivity questions.

What is Human Review? A reviewer can approve the AI-generated supporting draft, modify it, or reject the request.

Can I choose the route? No. PrivEdge decides automatically.

What is RAG? Retrieval-Augmented Generation: for cloud answers PrivEdge first looks up relevant Knowledge Base documents and gives them to the model as context."""),
    ("Application Documentation", "Technical", "Technical documentation for PrivEdge API, integrations, and configuration options.", """Backend: FastAPI (Python). Frontend: React + TypeScript + Vite. Database: SQLite in development, PostgreSQL for deployment.

Main endpoints: POST /auth/register, POST /auth/login, POST /chat, GET /chat/history, POST /analyze, GET /review/pending, GET /review/{id}, POST /review/{id}, GET /dashboard/statistics. Interactive API documentation is at /docs (Swagger/OpenAPI).

POST /chat request: {message, conversation_id}. Response includes the answer, the selected route, the reason, the privacy/sensitivity/complexity/risk scores and whether human review is required.

Configuration is via environment variables: GEMINI_API_KEY, GEMINI_MODEL, OLLAMA_BASE_URL, OLLAMA_MODEL, ROUTER_MODE (rule or ml), DATABASE_URL, JWT_SECRET and the routing thresholds PRIVACY_THRESHOLD, RISK_THRESHOLD and COMPLEXITY_THRESHOLD."""),
    ("Privacy Policy & Data Handling", "Legal", "How PrivEdge handles, processes, and protects user data.", """PrivEdge stores your account details, your conversations and routing metadata. Conversation text is encrypted at rest.

Sensitive queries are handled locally by Edge AI. Non-sensitive queries may be processed by the cloud model provider; sensitive-looking values are masked before leaving the server, and earlier private turns of a conversation are never included in cloud requests.

Human reviewers see masked text only. Administrators can see routing scores and logs but not your message content. You can delete a conversation at any time; deleting removes its messages and routing logs."""),
]


def seed(db: Session) -> None:
    s = get_settings()
    for name, email, pw, role in [("Admin", s.seed_admin_email, s.seed_admin_password, "ADMIN"),
                                  ("Reviewer", s.seed_reviewer_email, s.seed_reviewer_password, "REVIEWER")]:
        if not db.query(User).filter(User.email == email.lower()).first():
            db.add(User(name=name, email=email.lower(), password_hash=hash_password(pw), role=role))
    if db.query(KnowledgeDocument).count() == 0:
        for title, typ, desc, content in DOCS:
            db.add(KnowledgeDocument(title=title, doc_type=typ, description=desc, content=content, version="1.0.0"))
    db.commit()
