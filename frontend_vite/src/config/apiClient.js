// src/config/apiClient.js

// ✅ Base URL
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
console.log("🔍 API_BASE (build):", API_BASE);

// ✅ Firebase token helper
async function getAuthHeaders() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return {};

  // Firebase stores token internally — refresh if needed
  const token = await window?.firebase?.auth()?.currentUser?.getIdToken?.();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ✅ Analyze meeting
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
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

// ✅ Get user-specific meetings
export async function getMeetings() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings`, { headers });
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

// ✅ Get meeting details (user scoped)
export async function getMeeting(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/meetings/${id}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch meeting details");
  return res.json();
}

// ✅ Send feedback
export async function submitFeedback(message, userEmail) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify({ user_email: userEmail, message }),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return res.json();
}