"""Chat file attachments: upload flows through the SAME analysis/routing pipeline."""
import io

from tests.conftest import Calls


def make_pdf(text: str) -> bytes:
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(72, 750, text)
    c.save()
    return buf.getvalue()


def upload(client, headers, filename, content, message="", conversation_id=None):
    files = {"file": (filename, content)}
    data = {"message": message}
    if conversation_id is not None:
        data["conversation_id"] = str(conversation_id)
    return client.post("/chat/attachment", headers=headers, files=files, data=data)


def test_txt_attachment_goes_to_cloud_for_non_sensitive_content(client, alice):
    r = upload(client, alice, "notes.txt", b"What is the capital of France? General trivia question.", "Please summarize")
    assert r.status_code == 200
    body = r.json()
    assert body["route"] == "cloud" and body["attachment_name"] == "notes.txt"
    assert Calls.cloud and "notes.txt" in Calls.cloud[-1]["prompt"]


def test_txt_attachment_with_confidential_content_goes_to_edge(client, alice):
    r = upload(client, alice, "report.txt", b"Confidential employee salary report: Jane Doe, salary 120000, account number 987654321.")
    assert r.status_code == 200
    body = r.json()
    assert body["route"] == "edge" and not Calls.cloud


def test_pdf_attachment_extracts_text_and_routes(client, alice):
    pdf_bytes = make_pdf("Confidential internal report: employee performance review details.")
    r = upload(client, alice, "review.pdf", pdf_bytes)
    assert r.status_code == 200
    body = r.json()
    assert body["route"] == "edge" and body["attachment_name"] == "review.pdf"


def test_unsupported_file_type_rejected(client, alice):
    r = upload(client, alice, "image.png", b"\x89PNG\r\n\x1a\nfake")
    assert r.status_code == 415


def test_oversized_file_rejected(client, alice):
    r = upload(client, alice, "big.txt", b"x" * 3_500_000)
    assert r.status_code == 413


def test_empty_file_rejected(client, alice):
    r = upload(client, alice, "empty.txt", b"")
    assert r.status_code == 422


def test_scanned_pdf_with_no_text_rejected(client, alice):
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.showPage()  # blank page, no text at all
    c.save()
    r = upload(client, alice, "scan.pdf", buf.getvalue())
    assert r.status_code == 422


def test_attachment_caption_shown_but_full_text_used_for_analysis(client, alice):
    r = upload(client, alice, "doc.txt", b"My account number is 445566778899, please review.", "Quick check please")
    cid = r.json()["conversation_id"]
    conv = client.get(f"/conversations/{cid}", headers=alice).json()
    msg = conv["messages"][0]
    assert msg["text"] == "Quick check please"  # caption, not the full document dumped into the bubble
    assert msg["attachment_name"] == "doc.txt"
    assert msg["route"] == "edge"  # account number still detected and routed correctly


def test_attachment_requires_auth(client):
    r = client.post("/chat/attachment", files={"file": ("x.txt", b"hello")})
    assert r.status_code == 401
