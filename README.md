# 🧠 Meetly.AI – AI-Powered Meeting Summarizer

![GitHub Repo](https://img.shields.io/badge/GitHub-Meetly.AI-blue?logo=github)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Firebase](https://img.shields.io/badge/Auth-Firebase-orange?logo=firebase)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)
![PDF](https://img.shields.io/badge/Export-PDF-red?logo=adobeacrobatreader)

> **Meetly.AI** is a full-stack AI-powered meeting assistant that automatically generates summaries, action items, and sentiment analysis from transcripts — built with **React**, **FastAPI**, and **Google Gemini**.  
> Securely authenticated with **Firebase**, user-specific meetings are stored and analyzed in real time, complete with **shareable links**, **PDF exports**, and a beautiful dashboard interface.

---

## 🌐 Live Demo

- **Frontend:** [https://meetly-ai-frontend.vercel.app](https://meetly-ai-frontend.vercel.app)
- **Backend:** [https://meetly-ai-backend-811871431727.asia-south1.run.app](https://meetly-ai-backend-811871431727.asia-south1.run.app)  
- **GitHub Repo:** [https://github.com/Adityakocheri1511/meetly-ai](https://github.com/Adityakocheri1511/meetly-ai)

---

## 🚀 Features

✅ **AI-Powered Analysis**
- Generates meeting **summaries**, **decisions**, and **action items** using Google Gemini.
- Performs **sentiment analysis** to capture meeting tone (positive, neutral, negative).

✅ **User Authentication (Firebase)**
- Secure Google Sign-In with **Firebase ID Token validation** on the backend.
- **User-scoped meetings** — each user sees only their data.

✅ **Dashboard Insights**
- Dynamic charts and stats on meetings.
- Recent meeting summaries with quick preview cards.

✅ **Shareable Links**
- Each meeting can be shared via a **public read-only link**.

✅ **🧾 Download Summary as PDF**
- Export any meeting summary, action items, and decisions as a **clean, formatted PDF**.
- Built using `jspdf` and `html2canvas` for professional-quality export.

✅ **Responsive & Modern UI**
- Built with **Mantine**, **Framer Motion**, and **Recharts** for elegant UX.
- Light/Dark mode support based on user preference or system time.

---

## 🧩 Tech Stack

### **Frontend**
- React (Vite)
- Mantine UI
- Firebase Auth
- Framer Motion
- Recharts
- jsPDF / html2canvas (for PDF export)
- Vercel (Deployment)

### **Backend**
- FastAPI
- Google Gemini API (via `google-generativeai`)
- SQLite (Persistent storage)
- Firebase ID Token Verification (via REST)
- Google Cloud Platform - Google Cloud Build/Run (Deployment)

---

## 🧱 Project Structure

```bash
meetly-ai/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── dashboard.png
│   │   │   ├── meetingdetails.png
│   │   │   ├── analysis.png
│   │   │   └── pdf-export.png
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md

---

## 🧠 How It Works

1. **User logs in** via Google (Firebase Auth).  
2. **Transcript is submitted** for analysis.  
3. **FastAPI backend** sends the transcript to **Gemini API** for processing.  
4. Gemini returns a **structured JSON** containing:  
   - Summary points  
   - Action items  
   - Decisions  
   - Sentiment data  
5. Backend stores all data **scoped by the user UID**.  
6. Frontend visualizes insights with **charts**, **cards**, and **detailed views**.

---

## 🛠️ Setup & Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Adityakocheri1511/meetly-ai.git
cd meetly-ai

2️⃣ Backend Setup
cd backend
pip install -r requirements.txt

Create a .env file:
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_API_KEY=your_firebase_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_ADDRESS=your_email
EMAIL_PASSWORD=your_email_password
MEETINGS_DB_PATH=meetings.db

Run the server:
uvicorn main:app --reload

3️⃣ Frontend Setup
cd frontend
npm install

Create a .env file:
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

Run the app:
npm run dev

Frontend will be available at 👉 http://localhost:5173


---

---

## 📸 Screenshots

<details>
  <summary>📂 Click to view project screenshots</summary>
  <br>

  <div align="center">

  ### 🏠 Dashboard  
  <img src="./frontend/src/assets/dashboard.png" width="85%" alt="Meetly.AI Dashboard" />

  ---

  ### 🧠 AI Analysis  
  <img src="./frontend/src/assets/analysis.png" width="85%" alt="Meetly.AI AI Analysis" />

  ---

  ### 🗂️ Meeting Details  
  <img src="./frontend/src/assets/meetingdetails.png" width="85%" alt="Meetly.AI Meeting Details" />

  ---

  ### 🧾 PDF Export  
  <img src="./frontend/src/assets/pdf-export.png" width="85%" alt="Meetly.AI PDF Export Feature" />

  </div>

</details>

---

## 🔐 Authentication Flow

- User logs in using **Google Sign-In**.  
- Firebase provides an **ID Token**.  
- Token is verified on the backend via Google’s REST API:  
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=FIREBASE_API_KEY`  
- Every meeting, summary, or feedback is securely stored under the user’s UID.

---

## 🧠 Example API Usage

### POST `/api/v1/analyze`
```json
{
  "transcript": "Today's meeting discussed Q4 targets and marketing spend.",
  "title": "Q4 Planning"
}

Response
{
  "summary": ["Reviewed Q4 targets", "Adjusted marketing budget"],
  "action_items": [{"task": "Finalize campaign plan", "assignee": "Marketing", "due": null}],
  "decisions": ["Increased digital spend by 10%"],
  "sentiment": {"sentiment": "positive", "score": 0.7}
}
---

### 🧩 Notes:
- ✅ The screenshots are hidden by default and can be expanded.
- ✅ Works beautifully on **GitHub desktop & mobile**.
- ✅ Image paths point to `./frontend/src/assets/...`
- ✅ Add the following files to your assets folder:

frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── dashboard.png
│   │   │   ├── meetingdetails.png
│   │   │   ├── analysis.png
│   │   │   └── pdf-export.png

👨‍💻 Developer

Aditya Kocheri
💼 LinkedIn￼
📧 adityapkocheri@gmail.com
🚀 Passionate about building AI-integrated full-stack products.

⸻

🏁 Future Enhancements
	•	🌍 Multi-user collaboration view
	•	🪄 Voice-to-text transcription (Whisper API)
	•	📱 PWA Support for mobile

⸻

🪶 License

MIT License © 2025 Aditya Kocheri￼
