// src/config/apiClient.js
import { auth } from "../firebase";
import { getIdToken } from "firebase/auth";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

console.log("🔍 API_BASE (build):", API_BASE);

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await getIdToken(user, true); // force refresh
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ✅ Fetch user-specific meetings
export async function getMeetings() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings`, { headers });
  if (!res.ok) throw new Error("Server responded 401");
  return res.json();
}

// ✅ Analyze transcript (includes token)
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
  if (!res.ok) throw new Error("Server responded 401");
  return res.json();
}

// ✅ Get meeting by ID
export async function getMeeting(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`, { headers });
  if (!res.ok) throw new Error("Server responded 401");
  return res.json();
}