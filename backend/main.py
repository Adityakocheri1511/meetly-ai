# main.py – Meetly.AI Gemini Edition (Final Stable Build)
import os
import json
import sqlite3
import uuid
import random
import time
import requests
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from threading import Lock
import sendgrid 
from sendgrid.helpers.mail import Mail

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
# Firebase Verification
# -------------------------
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
if not FIREBASE_API_KEY:
    print("⚠️ FIREBASE_API_KEY not found in .env (user scoping disabled)")


def verify_firebase_token(authorization: str = Header(None)):
    """Verify Firebase ID token from the frontend using Firebase REST API."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    if not FIREBASE_API_KEY:
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY not configured.")
    try:
        token = authorization.split(" ")[1]
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
            json={"idToken": token},
            timeout=10,
        )
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Token verification failed")
        data = res.json()
        if "users" not in data:
            raise HTTPException(status_code=401, detail="Unauthorized user")
        user = data["users"][0]
        print(f"✅ Firebase verified: {user.get('email')}")
        return {
            "uid": user["localId"],
            "email": user.get("email", ""),
            "name": user.get("displayName", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")


# -------------------------
# Gemini Model Setup (Safe for Cloud Run)
# -------------------------
DEFAULT_MODEL = "gemini-2.0-flash"
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        MODEL = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
        print(f"✅ Gemini configured successfully using API key. Model set to: {MODEL}")
    except Exception as e:
        print(f"⚠️ Gemini initialization failed: {e}. Falling back to default model: {DEFAULT_MODEL}")
        MODEL = DEFAULT_MODEL
else:
    print(f"⚠️ GEMINI_API_KEY not found. Using default model: {DEFAULT_MODEL}")
    MODEL = DEFAULT_MODEL

DB_FILE = os.getenv("MEETINGS_DB_PATH", "meetings.db")

# -------------------------
# Database setup
# -------------------------
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            user_id TEXT,
            title TEXT,
            date TEXT,
            transcript TEXT,
            summary TEXT,
            action_items TEXT,
            decisions TEXT,
            sentiment TEXT,
            share_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            user_email TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    con.commit()
    con.close()

def list_meetings(user_id: str, limit: int = 50):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT id, title, date, summary, created_at FROM meetings WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    )
    rows = cur.fetchall()
    con.close()
    return [
        {"id": r[0], "title": r[1], "date": r[2], "summary_preview": json.loads(r[3])[:2] if r[3] else [], "created_at": r[4]}
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
# FastAPI App
# -------------------------
app = FastAPI(title="Meetly.AI - Gemini Edition")

origins = [
    # Production frontends
    "https://meetly-ai.vercel.app",
    "https://meetly-ai-frontend.vercel.app",
    "https://www.meetly-ai-frontend.vercel.app",

    # Optional Vercel preview deployments (for feature branches)
    "https://meetly-ai-frontend-git-main-adityakocheri.vercel.app",

    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return {"message": "Meetly.AI backend is live 🚀"}

# -------------------------
# Analyze Route
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

def call_gemini(prompt: str) -> str:
    print(f"🚀 Sending prompt to Gemini model: {MODEL}")
    try:
        model = genai.GenerativeModel(MODEL)
        response = model.generate_content(prompt)
        print("✅ Gemini API responded successfully")
        return getattr(response, "text", "")
    except Exception as e:
        print(f"❌ Gemini API call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini call failed: {str(e)}")

@app.get("/api/v1/test-secrets")
def test_secrets():
    """Quick check that secrets are loaded correctly inside Cloud Run."""
    return {
        "GEMINI_API_KEY": bool(os.getenv("GEMINI_API_KEY")),
        "FIREBASE_API_KEY": bool(os.getenv("FIREBASE_API_KEY")),
        "SENDGRID_API_KEY": bool(os.getenv("SENDGRID_API_KEY")),
        "FROM_EMAIL": bool(os.getenv("FROM_EMAIL")),
        "DB_FILE": os.getenv("MEETINGS_DB_PATH", "meetings.db"),
        "PORT": os.getenv("PORT")
    }

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, user=Depends(verify_firebase_token)):
    transcript = (req.transcript or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    user_email = getattr(req, "user_email", None) or "unknown_user@meetly.ai"

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
    import re
    raw = call_gemini(prompt)
    cleaned = re.sub(r"```json|```", "", raw)
    try:
        data = json.loads(cleaned)
    except:
        data = {}
    summary = data.get("summary", [])
    actions = data.get("action_items", [])
    decisions = data.get("decisions", [])
    sentiment = data.get("sentiment", {"sentiment": "neutral", "score": 0.0})

    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        """INSERT INTO meetings (user_id, user_email, title, date, transcript, summary, action_items, decisions, sentiment)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user["uid"], user_email, req.title, req.date, transcript,
         json.dumps(summary), json.dumps(actions), json.dumps(decisions), json.dumps(sentiment))
    )
    con.commit()
    meeting_id = cur.lastrowid
    con.close()

    return AnalyzeResponse(summary=summary, action_items=actions, decisions=decisions, sentiment=sentiment, meeting_id=meeting_id)

# -------------------------
# Meetings APIs
# -------------------------
@app.get("/api/v1/meetings")
async def api_list_meetings(limit: int = 50, user=Depends(verify_firebase_token)):
    """Return list of user's meetings."""
    meetings = list_meetings(user["uid"], limit)
    if not meetings:
        print(f"⚠️ No meetings found for user {user['email']} ({user['uid']})")
        return {"meetings": []}
    print(f"✅ Found {len(meetings)} meetings for {user['email']}")
    return {"meetings": meetings}


@app.get("/api/v1/meetings/{meeting_id}")
async def api_get_meeting(meeting_id: int, user=Depends(verify_firebase_token)):
    """Return full meeting details for a specific meeting."""
    meeting = get_meeting(meeting_id, user["uid"])
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found or access denied.")
    print(f"✅ Retrieved meeting {meeting_id} for {user['email']}")
    return meeting


# -------------------------
# Share Meeting (Generate + Access)
# -------------------------
@app.post("/api/v1/share/{meeting_id}")
async def share_meeting(meeting_id: int, user=Depends(verify_firebase_token)):
    """Generate a unique share token for a meeting."""
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()

    # Verify ownership
    cur.execute("SELECT user_id FROM meetings WHERE id = ?", (meeting_id,))
    row = cur.fetchone()
    if not row or row[0] != user["uid"]:
        con.close()
        raise HTTPException(status_code=403, detail="Not allowed to share this meeting.")

    # Create or reuse existing token
    cur.execute("SELECT share_token FROM meetings WHERE id = ?", (meeting_id,))
    existing_token = cur.fetchone()
    if existing_token and existing_token[0]:
        token = existing_token[0]
    else:
        token = str(uuid.uuid4())
        cur.execute("UPDATE meetings SET share_token = ? WHERE id = ?", (token, meeting_id))
        con.commit()

    con.close()
    share_url = f"https://meetly-ai-frontend.vercel.app/shared/{token}"
    print(f"🔗 Generated share link for meeting {meeting_id}: {share_url}")
    return {"share_url": share_url}


@app.get("/api/v1/shared/{token}")
async def get_shared_meeting(token: str):
    """Retrieve a meeting by its share token (public read-only)."""
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT title, date, summary, action_items, decisions, sentiment, transcript, created_at "
        "FROM meetings WHERE share_token = ?",
        (token,),
    )
    row = cur.fetchone()
    con.close()

    if not row:
        raise HTTPException(status_code=404, detail="Shared meeting not found or expired.")

    return {
        "title": row[0],
        "date": row[1],
        "summary": json.loads(row[2]) if row[2] else [],
        "action_items": json.loads(row[3]) if row[3] else [],
        "decisions": json.loads(row[4]) if row[4] else [],
        "sentiment": json.loads(row[5]) if row[5] else {},
        "transcript": row[6],
        "created_at": row[7],
    }

# -------------------------
# Feedback APIs
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
    cur.execute("INSERT INTO feedback (user_id, user_email, message) VALUES (?, ?, ?)",
                (user["uid"], req.user_email, req.message))
    con.commit()
    con.close()
    return {"status": "success", "message": "Feedback received successfully."}

@app.get("/api/v1/feedbacks")
async def list_feedback(user=Depends(verify_firebase_token)):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, user_email, message, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
                (user["uid"],))
    rows = cur.fetchall()
    con.close()
    return [{"id": r[0], "user_email": r[1], "message": r[2], "created_at": r[3]} for r in rows]

# -------------------------
# OTP Email (2FA)
# -------------------------
otp_store = {}
otp_lock = Lock()

@app.post("/api/v1/send_otp")
async def send_otp(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email required.")

    otp_code = str(random.randint(100000, 999999))
    expiry = time.time() + 300

    with otp_lock:
        otp_store[email] = {"otp": otp_code, "expires_at": expiry}

    # Send Email via SendGrid
    sg_api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("FROM_EMAIL", "no-reply@meetly.ai")

    if sg_api_key:
        try:
            sg = sendgrid.SendGridAPIClient(api_key=sg_api_key)
            message = Mail(
                from_email=from_email,
                to_emails=email,
                subject="🔐 Your Meetly.AI OTP Code",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; color: #111;">
                  <h2>🔑 Meetly.AI Login Verification</h2>
                  <p>Your One-Time Password (OTP) is:</p>
                  <h1 style="color:#4F46E5; letter-spacing: 3px;">{otp_code}</h1>
                  <p>This code is valid for <b>5 minutes</b>. If you didn’t request it, please ignore this email.</p>
                  <br/>
                  <p>– The Meetly.AI Team</p>
                </div>
                """
            )
            sg.send(message)
            print(f"📧 OTP email sent to {email}")
        except Exception as e:
            print(f"❌ Failed to send OTP email via SendGrid: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to send OTP email")
    else:
        print("⚠️ Missing SENDGRID_API_KEY – email not sent.")

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
            raise HTTPException(status_code=400, detail="OTP expired.")
        if entry["otp"] != str(otp_input):
            raise HTTPException(status_code=400, detail="Invalid OTP.")
        del otp_store[email]
    return {"status": "success", "message": "OTP verified successfully."}

# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))