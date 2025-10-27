const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function analyzeMeeting(transcript, title = "Untitled Meeting") {
  const response = await fetch(`${API_BASE}/analyze`, {
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
  const response = await fetch(`${API_BASE}/meetings`);
  return response.json();
}

export async function getMeeting(id) {
  const response = await fetch(`${API_BASE}/meetings/${id}`);
  return response.json();
}