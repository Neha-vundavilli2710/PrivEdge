"""Chat attachment -> plain text, so it can flow through the SAME privacy/risk
analysis and routing as any typed message. No OCR for scanned/image-only PDFs."""
import io

from fastapi import HTTPException

MAX_BYTES = 3_000_000  # 3 MB
MAX_CHARS = 12_000     # keep prompts reasonable; longer docs are truncated with a note
ALLOWED = {".txt", ".md", ".pdf"}


def _ext(filename: str) -> str:
    i = filename.rfind(".")
    return filename[i:].lower() if i != -1 else ""


def extract_text(filename: str, data: bytes) -> str:
    ext = _ext(filename or "")
    if ext not in ALLOWED:
        raise HTTPException(415, f"Unsupported file type '{ext or 'unknown'}'. Supported: {', '.join(sorted(ALLOWED))}.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, f"File too large ({len(data) // 1_000_000} MB). Max {MAX_BYTES // 1_000_000} MB.")
    if len(data) == 0:
        raise HTTPException(422, "The uploaded file is empty.")

    if ext in (".txt", ".md"):
        text = data.decode("utf-8", errors="ignore")
    else:  # .pdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise HTTPException(422, "This PDF is password-protected and can't be read.")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(422, f"Could not read this PDF: {type(e).__name__}.") from e

    text = text.strip()
    if not text:
        raise HTTPException(422, "No readable text could be extracted from this file (it may be a scanned image without OCR text).")
    truncated = len(text) > MAX_CHARS
    if truncated:
        text = text[:MAX_CHARS] + "\n\n[...document truncated for length...]"
    return text
