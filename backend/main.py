# main.py  – Meetly.AI Gemini Edition (User-isolated)
import os
from google.generativeai import GenerativeModel
import json
import sqlite3
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends   # ✅ added Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import random, time, smtplib, requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from threading import Lock

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
# Firebase Verification 🔹 ADDED FOR USER SCOPING
# -------------------------
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
if not FIREBASE_API_KEY:
    print("⚠️ FIREBASE_API_KEY not found in .env (user scoping disabled)")

def verify_firebase_token(authorization: str = Header(None)):
    """Verify Firebase ID token from frontend."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    try:
        token = authorization.split(" ")[1]
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
            json={"idToken": token}
        )
        data = res.json()
        if "users" not in data:
            raise HTTPException(status_code=401, detail="Unauthorized user.")
        user = data["users"][0]
        return {
            "uid": user["localId"],
            "email": user.get("email", ""),
            "name": user.get("displayName", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# -------------------------
# Automatically pick best available model
# -------------------------
AVAILABLE_MODELS = [
    m.name for m in genai.list_models() if "generateContent" in getattr(m, "supported_generation_methods", [])
]
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

# -------------------------
# Database helpers (updated for user_id)
# -------------------------
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            user_id TEXT,                           -- 🔹 added
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
    cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,                           -- 🔹 added
            user_email TEXT,
            message TEXT,
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
        INSERT INTO meetings (user_id, user_email, title, date, transcript, summary, action_items, decisions, sentiment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record.get("user_id"),
            record.get("user_email"),
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

def list_meetings(user_id: str, limit: int = 50):   # ✅ added user_id
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT id, title, date, summary, created_at FROM meetings WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    )
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

def get_meeting(meeting_id: int, user_id: str):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT id, title, date, transcript, summary, action_items, decisions, sentiment, created_at FROM meetings WHERE id = ? AND user_id = ?",
        (meeting_id, user_id),
    )
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
# FastAPI app
# -------------------------
app = FastAPI(title="Meetly.AI - Gemini Edition")

origins = [
    "https://meetly-ai-frontend.vercel.app",
    "https://www.meetly-ai-frontend.vercel.app",  # optional, handles www variant
    "http://localhost:5173",                       # for local testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Root + Health
# -------------------------
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "Meetly.AI Backend is running 🚀"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.on_event("startup")
def startup_event():
    init_db()

# -------------------------
# Request Models
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
    return getattr(response, "text", "")

# -------------------------
# API Routes (User Scoped)
# -------------------------
@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, user=Depends(verify_firebase_token)):   # ✅ user scoped
    transcript = (req.transcript or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    # ✅ Extract user_email if frontend sends it
    user_email = getattr(req, "user_email", None)
    if not user_email:
        user_email = "unknown_user@meetly.ai"

    prompt = f"""
You are a JSON-only meeting summarizer. Return only JSON in this schema:
{{
  "summary": ["point1", "point2"],
  "action_items": [{{"assignee": null, "task": "example", "due": null, "context": ""}}],
  "decisions": ["decision1"],
  "sentiment": {{"sentiment": "neutral", "score": 0.0}}
}}
Transcript: {transcript}
"""
    raw = call_gemini(prompt)
    import re
    cleaned = re.sub(r"```json|```", "", raw)
    try:
        data = json.loads(cleaned)
    except:
        data = {}
    summary = data.get("summary", [])
    actions = data.get("action_items", [])
    decisions = data.get("decisions", [])
    sentiment = data.get("sentiment", {"sentiment": "neutral", "score": 0.0})

    record = {
        "user_id": user["uid"],    # ✅ from Firebase token
        "user_email": user_email,  # ✅ NEW
        "title": req.title,
        "date": req.date,
        "transcript": transcript,
        "summary": summary,
        "action_items": actions,
        "decisions": decisions,
        "sentiment": sentiment,
    }
    meeting_id = save_meeting_record(record)
    return AnalyzeResponse(summary=summary, action_items=actions, decisions=decisions, sentiment=sentiment, meeting_id=meeting_id)

@app.get("/api/v1/meetings")
async def api_list_meetings(limit: int = 50, user=Depends(verify_firebase_token)):   # ✅ user scoped
    return {"meetings": list_meetings(user["uid"], limit)}

@app.get("/api/v1/meetings/{meeting_id}")
async def api_get_meeting(meeting_id: int, user=Depends(verify_firebase_token)):     # ✅ user scoped
    meeting = get_meeting(meeting_id, user["uid"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return meeting

# -------------------------
# Feedback (user scoped)
# -------------------------
class FeedbackRequest(BaseModel):
    user_email: str
    message: str

@app.post("/api/v1/feedback")
async def submit_feedback(req: FeedbackRequest, user=Depends(verify_firebase_token)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message is empty.")
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "INSERT INTO feedback (user_id, user_email, message) VALUES (?, ?, ?)",
        (user["uid"], req.user_email, req.message),
    )
    con.commit()
    con.close()
    return {"status": "success", "message": "Feedback received successfully."}

@app.get("/api/v1/feedbacks")
async def list_feedback(user=Depends(verify_firebase_token)):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, user_email, message, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC", (user["uid"],))
    rows = cur.fetchall()
    con.close()
    return [{"id": r[0], "user_email": r[1], "message": r[2], "created_at": r[3]} for r in rows]

# -------------------------
# Two-Factor Authentication (Email OTP)
# -------------------------
otp_store = {}
otp_lock = Lock()
SENDER_EMAIL = os.getenv("EMAIL_ADDRESS")
SENDER_PASSWORD = os.getenv("EMAIL_PASSWORD")

def send_otp_email(to_email: str, otp_code: str):
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    if not SENDGRID_API_KEY:
        raise HTTPException(status_code=500, detail="SendGrid API key missing in .env")
    data = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": "adityapkocheri@gmail.com", "name": "Meetly.AI Dashboard"},
        "subject": "🔐 Your Meetly.AI Verification Code",
        "content": [{"type": "text/html", "value": f"<h3>Your OTP: {otp_code}</h3>"}],
    }
    response = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
        json=data,
    )
    if response.status_code not in (200, 202):
        print("❌ SendGrid Error:", response.text)
        raise HTTPException(status_code=500, detail="Failed to send OTP email.")
    print(f"✅ OTP sent successfully to {to_email}")

@app.post("/api/v1/send_otp")
async def send_otp(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    otp_code = str(random.randint(100000, 999999))
    expiry = time.time() + 300
    with otp_lock:
        otp_store[email] = {"otp": otp_code, "expires_at": expiry}
    send_otp_email(email, otp_code)
    return {"status": "success", "message": f"OTP sent to {email}"}

@app.post("/api/v1/verify_otp")
async def verify_otp(payload: dict):
    email, otp_input = payload.get("email"), payload.get("otp")
    if not email or not otp_input:
        raise HTTPException(status_code=400, detail="Email and OTP required.")
    with otp_lock:
        entry = otp_store.get(email)
        if not entry:
            raise HTTPException(status_code=400, detail="No OTP found for this email.")
        if time.time() > entry["expires_at"]:
            del otp_store[email]
            raise HTTPException(status_code=400, detail="OTP expired. Request new one.")
        if entry["otp"] != str(otp_input):
            raise HTTPException(status_code=400, detail="Invalid OTP.")
        del otp_store[email]
    print(f"✅ OTP verified for {email}")
    return {"status": "success", "message": "OTP verified successfully."}

# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))

def verify_firebase_token(authorization: str = Header(None)):
    """Verify Firebase ID token from frontend."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    try:
        token = authorization.split(" ")[1]
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
            json={"idToken": token}
        )
        data = res.json()
        if "users" not in data:
            print("❌ Firebase verification failed:", data)
            raise HTTPException(status_code=401, detail="Unauthorized user.")
        user = data["users"][0]

        # ✅ Debug log for successful verification
        print("🔐 Token verification success:", user.get("email"))

        return {
            "uid": user["localId"],
            "email": user.get("email", ""),
            "name": user.get("displayName", ""),
        }
    except Exception as e:
        # ❌ Debug log for verification failure
        print("❌ Firebase verification error:", str(e))
        raise HTTPException(status_code=401, detail=str(e))