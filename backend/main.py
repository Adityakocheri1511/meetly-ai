# main.py – Meetly.AI Gemini Edition (User-isolated)
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
        print("❌ Missing Authorization header.")
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    if not FIREBASE_API_KEY:
        print("❌ FIREBASE_API_KEY missing — cannot verify token.")
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY not configured.")

    try:
        token = authorization.split(" ")[1]
        print("🔍 Received token (first 20 chars):", token[:20], "...")

        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
            json={"idToken": token},
            timeout=10,
        )

        if res.status_code != 200:
            print("❌ Firebase verification HTTP error:", res.status_code, res.text)
            raise HTTPException(status_code=401, detail="Token verification failed")

        data = res.json()
        if "users" not in data:
            print("❌ Firebase verification response missing 'users':", data)
            raise HTTPException(status_code=401, detail="Unauthorized user")

        user = data["users"][0]
        print("✅ Firebase verified:", user.get("email"), "| UID:", user.get("localId"))

        return {
            "uid": user["localId"],
            "email": user.get("email", ""),
            "name": user.get("displayName", ""),
        }

    except Exception as e:
        print("❌ Firebase verification exception:", str(e))
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")


# -------------------------
# Model Setup
# -------------------------
AVAILABLE_MODELS = [
    m.name
    for m in genai.list_models()
    if "generateContent" in getattr(m, "supported_generation_methods", [])
]
PREFERRED = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
]
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
# Database
# -------------------------
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        """
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
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            user_email TEXT,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
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


# -------------------------
# Analyze API
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
        "user_id": user["uid"],
        "user_email": user_email,
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


@app.get("/api/v1/meetings")
async def api_list_meetings(limit: int = 50, user=Depends(verify_firebase_token)):
    return {"meetings": list_meetings(user["uid"], limit)}


@app.get("/api/v1/meetings/{meeting_id}")
async def api_get_meeting(meeting_id: int, user=Depends(verify_firebase_token)):
    print(f"📥 Fetching meeting {meeting_id} for user:", user["email"], "| UID:", user["uid"])
    meeting = get_meeting(meeting_id, user["uid"])
    if not meeting:
        print(f"⚠️ Meeting {meeting_id} not found or not owned by UID:", user["uid"])
        raise HTTPException(status_code=404, detail="Meeting not found.")
    print(f"✅ Meeting {meeting_id} loaded successfully.")
    return meeting

# -------------------------
# Share Meeting API
# -------------------------
@app.post("/api/v1/share/{meeting_id}")
async def share_meeting(meeting_id: int, user=Depends(verify_firebase_token)):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT user_id FROM meetings WHERE id = ?", (meeting_id,))
    row = cur.fetchone()
    if not row or row[0] != user["uid"]:
        con.close()
        raise HTTPException(status_code=403, detail="Not allowed to share this meeting.")
    token = str(uuid.uuid4())
    cur.execute("UPDATE meetings SET share_token = ? WHERE id = ?", (token, meeting_id))
    con.commit()
    con.close()
    share_url = f"https://meetly-ai-frontend.vercel.app/shared/{token}"
    print(f"🔗 Generated share link for meeting {meeting_id}: {share_url}")
    return {"share_url": share_url}


@app.get("/api/v1/shared/{token}")
async def get_shared_meeting(token: str):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT id, title, date, transcript, summary, action_items, decisions, sentiment, created_at FROM meetings WHERE share_token = ?",
        (token,),
    )
    row = cur.fetchone()
    con.close()
    if not row:
        raise HTTPException(status_code=404, detail="Shared meeting not found.")
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

@app.get("/api/v1/feedbacks")
async def list_feedback(user=Depends(verify_firebase_token)):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute(
        "SELECT id, user_email, message, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC",
        (user["uid"],),
    )
    rows = cur.fetchall()
    con.close()
    return [
        {"id": r[0], "user_email": r[1], "message": r[2], "created_at": r[3]}
        for r in rows
    ]
# -------------------------
# Debug Route
# -------------------------
@app.get("/debug/meetings")
async def debug_meetings():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("SELECT id, title, user_id, user_email FROM meetings LIMIT 20")
    rows = cur.fetchall()
    con.close()
    return {"rows": rows}


# -------------------------
# Run Server
# -------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))