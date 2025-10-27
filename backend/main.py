# main.py  – Gemini Edition
import os
from google.generativeai import GenerativeModel
import json
import sqlite3
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

from fastapi import FastAPI

app = FastAPI()

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "Meetly.AI Backend is running 🚀"}

# -------------------------
# Environment + Gemini setup
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=API_KEY)
print("✅ Gemini configured")
# -------------------------
# Automatically pick best available model
# -------------------------
AVAILABLE_MODELS = [m.name for m in genai.list_models() if "generateContent" in getattr(m, "supported_generation_methods", [])]
PREFERRED = ["models/gemini-2.5-flash", "models/gemini-2.5-pro", "models/gemini-flash-latest", "models/gemini-pro-latest"]

for pref in PREFERRED:
    if pref in AVAILABLE_MODELS:
        MODEL = pref.split("models/")[-1]
        print(f"✅ Using available model: {MODEL}")
        break
else:
    MODEL = "gemini-2.0-flash"
    print(f"⚠️ Defaulting to fallback model: {MODEL}")

DB_FILE = os.getenv("MEETINGS_DB_PATH", "meetings.db")
CHUNK_CHAR_SIZE = int(os.getenv("CHUNK_CHAR_SIZE", "12000"))
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DB_FILE = os.getenv("MEETINGS_DB_PATH", "meetings.db")
CHUNK_CHAR_SIZE = int(os.getenv("CHUNK_CHAR_SIZE", "12000"))

# -------------------------
# Database helpers
# -------------------------
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            date TEXT,
            transcript TEXT,
            summary TEXT,
            action_items TEXT,
            decisions TEXT,
            sentiment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit()
    con.close()

def save_meeting_record(record: Dict[str, Any]) -> int:
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO meetings (title, date, transcript, summary, action_items, decisions, sentiment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record.get("title"),
            record.get("date"),
            record.get("transcript"),
            json.dumps(record.get("summary")),
            json.dumps(record.get("action_items")),
            json.dumps(record.get("decisions")),
            json.dumps(record.get("sentiment")),
        ),
    )
    con.commit()
    rowid = cur.lastrowid
    con.close()
    return rowid

def list_meetings(limit: int = 50):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, title, date, summary, created_at FROM meetings ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    con.close()
    return [
        {
            "id": r[0],
            "title": r[1],
            "date": r[2],
            "summary_preview": (json.loads(r[3])[:2] if r[3] else []),
            "created_at": r[4],
        }
        for r in rows
    ]

def get_meeting(meeting_id: int):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, title, date, transcript, summary, action_items, decisions, sentiment, created_at FROM meetings WHERE id = ?", (meeting_id,))
    row = cur.fetchone()
    con.close()
    if not row:
        return None
    return {
        "id": row[0],
        "title": row[1],
        "date": row[2],
        "transcript": row[3],
        "summary": json.loads(row[4]) if row[4] else [],
        "action_items": json.loads(row[5]) if row[5] else [],
        "decisions": json.loads(row[6]) if row[6] else [],
        "sentiment": json.loads(row[7]) if row[7] else {},
        "created_at": row[8],
    }

# -------------------------
# Request / Response models
# -------------------------
class AnalyzeRequest(BaseModel):
    transcript: str
    title: Optional[str] = "Untitled Meeting"
    date: Optional[str] = None

class ActionItem(BaseModel):
    assignee: Optional[str] = None
    task: str
    due: Optional[str] = None
    context: Optional[str] = None

class AnalyzeResponse(BaseModel):
    summary: List[str]
    action_items: List[ActionItem]
    decisions: List[str]
    sentiment: Dict[str, Any]
    meeting_id: Optional[int] = None

# -------------------------
# Gemini helper
# -------------------------
def call_gemini(prompt: str) -> str:
    model = genai.GenerativeModel(MODEL)
    response = model.generate_content(prompt)
    if hasattr(response, "text"):
        return response.text
    elif hasattr(response, "candidates"):
        # fallback if SDK returns list of candidates
        return response.candidates[0].content.parts[0].text
    return ""

# -------------------------
# FastAPI app
# -------------------------
app = FastAPI(title="Meetly.AI - Gemini Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    transcript = (req.transcript or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    # Prompt for Gemini
    prompt = f"""
You are a JSON-only meeting summarizer.
Return **only valid JSON** with this exact schema — no markdown, no explanations.
If a section has no clear data, still include an empty object or a brief inferred item.

Schema:
{{
  "summary": ["<bullet1>", "<bullet2>", "<bullet3>"],
  "action_items": [
    {{
      "assignee": "<name or null>",
      "task": "<task or inferred task>",
      "due": "<date or null>",
      "context": "<short context>"
    }}
  ],
  "decisions": ["<decision1>", "<decision2>"],
  "sentiment": {{"sentiment": "<positive|neutral|negative>", "score": <float between -1 and 1>}}
}}

Meeting transcript:
{transcript}
"""

    try:
        raw = call_gemini(prompt)
        # Rough parsing of text for sections
        summary, actions, decisions, sentiment = [], [], [], {"sentiment": "neutral", "score": 0.0}

        # try to parse JSON parts if present
        import re, json
        cleaned = re.sub(r"```json|```", "", raw)

        try:
            match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
            json_str = match.group(1) if match else cleaned
            data = json.loads(json_str)
        except Exception:
            data = {}

        summary   = data.get("summary") or []
        actions   = data.get("action_items") or data.get("actions") or []
        decisions = data.get("decisions") or []
        sentiment = data.get("sentiment") or {"sentiment": "neutral", "score": 0.0}

        record = {
            "title": req.title,
            "date": req.date,
            "transcript": transcript,
            "summary": summary,
            "action_items": actions,
            "decisions": decisions,
            "sentiment": sentiment,
        }
        meeting_id = save_meeting_record(record)

        return AnalyzeResponse(
            summary=summary,
            action_items=actions,
            decisions=decisions,
            sentiment=sentiment,
            meeting_id=meeting_id,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/meetings")
async def api_list_meetings(limit: int = 50):
    return {"meetings": list_meetings(limit)}

@app.get("/api/v1/meetings/{meeting_id}")
async def api_get_meeting(meeting_id: int):
    m = get_meeting(meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return m

@app.get("/health")
async def health():
    return {"status": "ok"}
# -------------------------
# Feedback Support
# -------------------------
def init_feedback_table():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit()
    con.close()


def save_feedback(user_email: str, message: str):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "INSERT INTO feedback (user_email, message) VALUES (?, ?)",
        (user_email, message),
    )
    con.commit()
    con.close()


@app.on_event("startup")
def startup_event():
    init_db()
    init_feedback_table()  # ✅ new feedback table


class FeedbackRequest(BaseModel):
    user_email: str
    message: str


@app.post("/api/v1/feedback")
async def submit_feedback(req: FeedbackRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message is empty.")
    try:
        save_feedback(req.user_email, req.message)
        return {"status": "success", "message": "Feedback received successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving feedback: {str(e)}")
@app.get("/api/v1/feedbacks")
async def list_feedback():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, user_email, message, created_at FROM feedback ORDER BY created_at DESC")
    rows = cur.fetchall()
    con.close()
    return [
        {
            "id": r[0],
            "user_email": r[1],
            "message": r[2],
            "created_at": r[3],
        }
        for r in rows
    ]
# -------------------------
# Two-Factor Authentication (Email OTP)
# -------------------------
import random, time, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from threading import Lock

otp_store = {}  # {email: {"otp": "123456", "expires_at": 1234567890}}
otp_lock = Lock()

SENDER_EMAIL = os.getenv("EMAIL_ADDRESS")
SENDER_PASSWORD = os.getenv("EMAIL_PASSWORD")

import requests

def send_otp_email(to_email: str, otp_code: str):
    """Send OTP email via SendGrid API (reliable + fast)."""
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    if not SENDGRID_API_KEY:
        raise HTTPException(status_code=500, detail="SendGrid API key missing in .env")

    data = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": "adityapkocheri@gmail.com", "name": "Meetly.AI Dashboard"},
        "subject": "🔐 Your Meetly.AI Verification Code",
        "content": [{
            "type": "text/html",
            "value": f"""
                <h2 style='color:#4F46E5;'>Meetly.AI Dashboard</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h3 style='color:#4F46E5;letter-spacing:3px;'>{otp_code}</h3>
                <p>This code will expire in <b>5 minutes</b>.</p>
                <p>Thank you,<br><b>Meetly.AI Team</b></p>
            """
        }]
    }

    response = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        },
        json=data,
    )

    if response.status_code not in (200, 202):
        print("❌ SendGrid Error:", response.text)
        raise HTTPException(status_code=500, detail="Failed to send OTP email.")

    print(f"✅ OTP sent successfully to {to_email}")


# -------------------------
# FastAPI Routes for OTP
# -------------------------
@app.post("/api/v1/send_otp")
async def send_otp(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    otp_code = str(random.randint(100000, 999999))
    expiry = time.time() + 300  # 5 minutes

    with otp_lock:
        otp_store[email] = {"otp": otp_code, "expires_at": expiry}

    # Send the email
    send_otp_email(email, otp_code)

    return {"status": "success", "message": f"OTP sent to {email}"}


@app.post("/api/v1/verify_otp")
async def verify_otp(payload: dict):
    email = payload.get("email")
    otp_input = payload.get("otp")

    if not email or not otp_input:
        raise HTTPException(status_code=400, detail="Email and OTP required.")

    with otp_lock:
        entry = otp_store.get(email)
        if not entry:
            raise HTTPException(status_code=400, detail="No OTP found for this email.")
        if time.time() > entry["expires_at"]:
            del otp_store[email]
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
        if entry["otp"] != str(otp_input):
            raise HTTPException(status_code=400, detail="Invalid OTP.")

        # OTP is valid
        del otp_store[email]

    print(f"✅ OTP verified successfully for {email}")
    return {"status": "success", "message": "OTP verified successfully."}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)