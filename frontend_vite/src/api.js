// src/api.js

// ✅ Safe, environment-aware API base URL
let base = "http://127.0.0.1:8000";

try {
  // Prefer the Vite environment variable (in production via Vercel)
  base = import.meta.env.VITE_API_BASE_URL || base;
} catch (err) {
  console.warn("⚠️ Falling back to local API_BASE:", err);
}

export const API_BASE = base;

// ✅ Helper functions
export async function analyzeMeeting(transcript, title = "Untitled Meeting") {
  const response = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      date: new Date().toISOString().split("T")[0],
      transcript,
    }),
  });

  if (!response.ok) throw new Error("Analysis failed");
  return response.json();
}

export async function getMeetings() {
  const response = await fetch(`${API_BASE}/api/v1/meetings`);
  if (!response.ok) throw new Error("Failed to fetch meetings");
  return response.json();
}

export async function getMeeting(id) {
  const response = await fetch(`${API_BASE}/api/v1/meetings/${id}`);
  if (!response.ok) throw new Error("Failed to fetch meeting details");
  return response.json();
}