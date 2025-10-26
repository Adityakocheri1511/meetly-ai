from pathlib import Path

# === Meetly.AI - Final README ===
readme_content = """<p align="center">
  <img src="./A_digital_graphic_design_banner_features_the_brand.png" alt="Meetly.AI Banner" width="100%" />
</p>

<h1 align="center">🧠 Meetly.AI</h1>
<p align="center"><b>AI-Powered Meeting Intelligence Platform</b></p>
<p align="center">Transform your meetings into structured, actionable insights using <b>Google Gemini AI</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-green?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/AI-Gemini%20API-orange?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Auth-Firebase-yellow?style=for-the-badge&logo=firebase" />
  <img src="https://img.shields.io/badge/DB-SQLite-lightgrey?style=for-the-badge&logo=sqlite" />
</p>

---

## 🌟 Overview

**Meetly.AI** is an intelligent meeting assistant that converts conversations into concise summaries, decisions, and action points — powered by **Google Gemini Generative AI**.

It helps professionals save time by delivering **instant AI insights**, **data-driven sentiment analysis**, and **secure user experience** with **Two-Factor Authentication (2FA)**.

---

## 🧩 Tech Stack

| Category | Technology |
|-----------|-------------|
| **Frontend** | React.js (Vite), Mantine UI, Framer Motion, Recharts |
| **Backend** | FastAPI (Python) |
| **Database** | SQLite |
| **AI Model** | Google Gemini |
| **Authentication** | Firebase Auth (Email + Google) |
| **Email (2FA)** | SendGrid API |
| **Styling** | Mantine Themes + Glassmorphism UI |

---

## ✨ Features

### 🔐 Authentication & Security
- Login with **Email/Password** or **Google Sign-In**
- Built-in **Two-Factor Authentication (2FA)** via Email OTP
- Firebase session-based user management
- Theme-aware Logout confirmation modal

### 🤖 AI-Powered Meeting Analysis
- Upload or paste meeting transcripts
- Get **AI-generated summaries**, **action items**, and **sentiment**
- Charts for **emotional tone** and **engagement trend**
- Data stored locally in SQLite with timestamps

### ⚙️ User Settings
- Notifications, Sound, Language preference
- Dark/Light Mode toggle
- Default AI model selector
- “Clear History” and “Enable 2FA” options
- Built-in feedback form with SendGrid integration

### 🧑‍💼 Profile Management
- Editable user profile with picture overlay button
- Theme-aware inputs and components
- Auto-sync with Firebase display name

### 📊 Meeting History
- List and revisit past meetings
- Individual meeting details with AI insights
- Persistent across sessions (SQLite)

---

## ⚡ Quick Start

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Adityakocheri1511/meetly-ai.git
cd meetly-ai

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Runs on ➜ **http://localhost:5173**

### 3️⃣ Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on ➜ **http://127.0.0.1:8000**

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` folder:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_ADDRESS=your_verified_sendgrid_email
MEETINGS_DB_PATH=meetings.db
```

> 💡 Make sure your “From Email” in SendGrid is **verified under Sender Identities**.

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/v1/analyze` | `POST` | Analyze meeting transcript via Gemini |
| `/api/v1/meetings` | `GET` | Retrieve all stored meetings |
| `/api/v1/meetings/{id}` | `GET` | Retrieve a specific meeting |
| `/api/v1/feedback` | `POST` | Submit user feedback |
| `/api/v1/send_otp` | `POST` | Send 2FA OTP email |
| `/api/v1/verify_otp` | `POST` | Verify OTP for 2FA |
| `/health` | `GET` | Health check endpoint |

---

## 🎨 UI Highlights

- 🌓 **Dynamic Theme Switching**
- 💫 **Smooth Animations (Framer Motion)**
- 📊 **Sentiment Charts (Recharts)**
- 🧭 **Smart Navbar Titles**
- 🪄 **Glassmorphism Design**
- 📱 **Fully Responsive Layout**

---

## 🧾 Database Schema

**meetings.db**

```sql
CREATE TABLE meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  date TEXT,
  transcript TEXT,
  summary TEXT,
  action_items TEXT,
  decisions TEXT,
  sentiment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧠 Future Enhancements

- 🎤 Voice-based real-time meeting transcription  
- 🌍 Multi-language support for AI summaries  
- 🔗 Google Meet / Zoom API integration  
- 📈 Admin analytics dashboard  
- 📥 Export meetings as PDF or CSV  

---

## 👨🏻‍💻 Author

**Aditya Kocheri**  
Developer @ Capgemini | Oracle + Python Developer | AI Enthusiast  
📧 [adityapkocheri@gmail.com](mailto:adityapkocheri@gmail.com)  
🔗 [LinkedIn](https://www.linkedin.com/in/adityakocheri)  
💻 [GitHub](https://github.com/yourusername)

---

## 🪄 Credits

- 🧠 Google Gemini for AI Insights  
- 🧰 Mantine UI for design system  
- 🔥 Firebase for authentication  
- ✉️ SendGrid for OTP delivery  
- 🎬 Framer Motion for animations  

---

<p align="center">
  <b>Meetly.AI — Empower Your Meetings with Intelligence ⚡</b><br/>
  <sub>© 2025 Aditya Kocheri. All rights reserved.</sub>
</p>
"""

# Create and save the file for download
readme_path = Path("/mnt/data/README.md")
readme_path.write_text(readme_content, encoding="utf-8")

readme_path