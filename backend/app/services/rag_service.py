"""RAG (PROJECT EXTENSION, not in the original PDF): lexical TF-IDF retrieval over
Published knowledge documents. Used on the Cloud path only, after routing."""
from sqlalchemy.orm import Session

from app.db.models import KnowledgeDocument

MIN_SCORE = 0.10
CHUNK = 350


def _chunks(doc: KnowledgeDocument) -> list[tuple[str, str]]:
    text = f"{doc.description}\n{doc.content}".strip()
    paras, out, cur = [p.strip() for p in text.split("\n\n") if p.strip()], [], ""
    for p in paras:
        if len(cur) + len(p) > CHUNK and cur:
            out.append((doc.title, cur))
            cur = ""
        cur += ("\n\n" if cur else "") + p
    if cur:
        out.append((doc.title, cur))
    return out


def retrieve(db: Session, query: str, k: int = 3) -> list[dict]:
    docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.status == "Published").all()
    chunks = [c for d in docs for c in _chunks(d)]
    if not chunks:
        return []
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vec = TfidfVectorizer(stop_words="english", sublinear_tf=True)
        matrix = vec.fit_transform([c[1] for c in chunks] + [query])
        sims = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    except ValueError:  # empty vocabulary
        return []
    ranked = sorted(zip(sims, chunks), key=lambda x: -x[0])[:k]
    return [{"title": t, "text": txt, "score": round(float(s), 3)} for s, (t, txt) in ranked if s >= MIN_SCORE]


def build_context(hits: list[dict]) -> str:
    return "\n\n".join(f"[{h['title']}]\n{h['text']}" for h in hits)
