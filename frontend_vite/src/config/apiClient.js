import { auth } from "../firebase";
import { getIdToken } from "firebase/auth";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

console.log("🔍 API_BASE (build):", API_BASE);

// 🔐 Helper to attach Firebase token
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await getIdToken(user, true);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// 🧩 Fetch all meetings (user scoped)
export async function getMeetings() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings`, { headers });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
}

// 🧩 Fetch specific meeting (for Details page)
export async function getMeeting(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`, { headers });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
}

// 🧩 Analyze meeting transcript (AI)
export async function analyzeMeeting(transcript, title = "Untitled Meeting") {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title,
      date: new Date().toISOString().split("T")[0],
      transcript,
    }),
  });
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res.json();
}