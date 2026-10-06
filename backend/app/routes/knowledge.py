"""Knowledge Base (PROJECT EXTENSION): user browse + admin management. Feeds RAG."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import KnowledgeDocument, User
from app.schemas.schemas import KnowledgeIn
from app.security.deps import get_current_user, require_admin
from app.services.audit import audit
from app.services.privacy_analyzer import analyze_privacy

user_router = APIRouter(prefix="/knowledge", tags=["knowledge"])
admin_router = APIRouter(prefix="/admin/knowledge", tags=["admin-knowledge"])


def doc_out(d: KnowledgeDocument, full: bool = False) -> dict:
    out = {"id": d.doc_id, "title": d.title, "type": d.doc_type, "description": d.description, "version": d.version,
           "status": d.status, "updated_at": d.updated_at.isoformat()}
    if full:
        out["content"] = d.content
    return out


def _guard_sensitive(text: str):
    """Documents pass privacy analysis BEFORE being indexed for RAG (RAG feeds the cloud path)."""
    r = analyze_privacy(text)
    if r.sensitivity_score >= get_settings().sensitivity_threshold:
        raise HTTPException(422, f"Document appears to contain sensitive data ({', '.join(r.pii_types + r.categories)}) and was not indexed.")


@user_router.get("")
def list_docs(q: str = "", type: str = "", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.status == "Published").order_by(KnowledgeDocument.updated_at.desc()).all()
    ql = q.lower()
    return [doc_out(d) for d in docs
            if (not q or ql in d.title.lower() or ql in d.description.lower() or ql in d.content.lower())
            and (not type or d.doc_type == type)]


@user_router.get("/{doc_id}")
def get_doc(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(KnowledgeDocument, doc_id)
    if not d or d.status != "Published":
        raise HTTPException(404, "Document not found")
    return doc_out(d, full=True)


@admin_router.get("")
def admin_list(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return [doc_out(d) for d in db.query(KnowledgeDocument).order_by(KnowledgeDocument.updated_at.desc()).all()]


@admin_router.get("/{doc_id}")
def admin_get(doc_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    d = db.get(KnowledgeDocument, doc_id)
    if not d:
        raise HTTPException(404, "Document not found")
    return doc_out(d, full=True)


@admin_router.post("", status_code=201)
def admin_create(body: KnowledgeIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    _guard_sensitive(f"{body.title}\n{body.description}\n{body.content}")
    d = KnowledgeDocument(title=body.title, doc_type=body.doc_type, description=body.description, content=body.content, version=body.version, status=body.status)
    db.add(d)
    db.commit()
    audit(db, admin.user_id, "knowledge_created", d.title)
    return doc_out(d)


@admin_router.post("/upload", status_code=201)
async def admin_upload(file: UploadFile = File(...), title: str = Form(""), doc_type: str = Form("Guide"), description: str = Form(""),
                       version: str = Form("1.0.0"), admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith((".txt", ".md")):
        raise HTTPException(415, "Only .txt and .md files are supported")
    raw = await file.read()
    if len(raw) > 1_000_000:
        raise HTTPException(413, "File too large (max 1 MB)")
    text = raw.decode("utf-8", errors="ignore")
    _guard_sensitive(text)
    d = KnowledgeDocument(title=title or file.filename, doc_type=doc_type, description=description, content=text, version=version, status="Published")
    db.add(d)
    db.commit()
    audit(db, admin.user_id, "knowledge_uploaded", d.title)
    return doc_out(d)


@admin_router.put("/{doc_id}")
def admin_update(doc_id: int, body: KnowledgeIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    d = db.get(KnowledgeDocument, doc_id)
    if not d:
        raise HTTPException(404, "Document not found")
    _guard_sensitive(f"{body.title}\n{body.description}\n{body.content}")
    d.title, d.doc_type, d.description, d.content, d.version, d.status = body.title, body.doc_type, body.description, body.content, body.version, body.status
    db.commit()
    audit(db, admin.user_id, "knowledge_updated", d.title)
    return doc_out(d)


@admin_router.delete("/{doc_id}")
def admin_archive(doc_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    d = db.get(KnowledgeDocument, doc_id)
    if not d:
        raise HTTPException(404, "Document not found")
    d.status = "Archived"
    db.commit()
    audit(db, admin.user_id, "knowledge_archived", d.title)
    return doc_out(d)
