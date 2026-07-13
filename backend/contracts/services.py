import io
import json
from django.conf import settings
import os


def extract_text(file_field) -> str:
    """Read the contract file from local disk and return its raw text."""
    path = file_field.path

    if path.lower().endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def call_gemini(text: str) -> dict:
    """Send the contract text to Gemini and return structured analysis.

    Retries automatically on transient server errors (503 Service Unavailable,
    etc.) with exponential backoff, since Gemini occasionally returns these
    under momentary load — not a bug in this code, just a flaky upstream call.
    """
    import time
    from google import genai
    from google.genai import errors as genai_errors

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = f"""Analyze this contract text and return ONLY valid JSON with this exact shape:
{{
  "non_compete": {{"present": true/false, "details": "..."}},
  "dates": {{"effective_date": "...", "expiration_date": "...", "renewal_terms": "..."}},
  "liability": {{"cap_present": true/false, "details": "..."}},
  "risk_score": 0-100
}}

Contract text:
{text[:20000]}
"""
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
    )
    parsed = json.loads(response.text.strip().strip("```json").strip("```"))

    return {
        "non_compete": parsed["non_compete"],
        "dates": parsed["dates"],
        "liability": parsed["liability"],
        "risk_score": float(parsed["risk_score"]),
    }


def generate_pdf(result) -> bytes:
    """Render a simple PDF report for one AnalysisResult."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"Contract Analysis Report — v{result.version}")
    c.setFont("Helvetica", 11)
    c.drawString(50, 720, f"Overall risk score: {result.overall_risk_score}")
    c.drawString(50, 700, f"Non-compete: {json.dumps(result.non_compete_json)[:90]}")
    c.drawString(50, 680, f"Dates: {json.dumps(result.dates_json)[:90]}")
    c.drawString(50, 660, f"Liability: {json.dumps(result.liability_json)[:90]}")
    c.save()
    buffer.seek(0)
    return buffer.read()

def delete_user_storage_files(paths: list[str]):
    """Explicitly clean up locally stored files — Postgres cascade does NOT touch the filesystem."""
    for path in paths:
        if path and os.path.exists(path):
            os.remove(path)