# main.py – Meetly.AI Gemini Edition (Final with OTP + Stable Backend)
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
# Gemini Model Setup
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


# -------------------------
# FastAPI App
# -------------------------
app = FastAPI(title="Meetly.AI - Gemini Edition")

origins = [
    "https://meetly-ai-frontend.vercel.app",
    "https://www.meetly-ai-frontend.vercel.app",
    "http://localhost:5173",
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
    model = genai.GenerativeModel(MODEL)
    response = model.generate_content(prompt)
    return getattr(response, "text", "")


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
    print(f"📧 OTP sent to {email}: {otp_code}")
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