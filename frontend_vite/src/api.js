// src/api.js

// ✅ Define a clean, static export (works with Rollup & Vite)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// ✅ Helper functions using API_BASE
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