// src/config/apiClient.js

// ✅ Clean static export (works 100% with Rollup)
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

// ✅ Log once during build (to verify Vercel picks it up)
console.log("🔍 API_BASE (build):", API_BASE);

// ✅ Helper functions
export async function analyzeMeeting(transcript, title = "Untitled Meeting") {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      date: new Date().toISOString().split("T")[0],
      transcript,
    }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function getMeetings() {
  const res = await fetch(`${API_BASE}/api/v1/meetings`);
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

export async function getMeeting(id) {
  const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`);
  if (!res.ok) throw new Error("Failed to fetch meeting details");
  return res.json();
}