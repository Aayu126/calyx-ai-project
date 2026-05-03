# 🔮 CALYX AI — The All-in-One AI Assistant

[![GitHub Star](https://img.shields.io/github/stars/Aayu126/calyx-ai-project?style=social)](https://github.com/Aayu126/calyx-ai-project)
[![GitHub Fork](https://img.shields.io/github/forks/Aayu126/calyx-ai-project?style=social)](https://github.com/Aayu126/calyx-ai-project)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://calyx.vercel.app)
[![Render Backend](https://img.shields.io/badge/Deploy-Render-46e3b7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

---

### 🛠️ Tech Stack

**Frontend:**
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

**Backend:**
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=flat-square&logo=gunicorn&logoColor=white)

**AI & Cloud:**
![Groq](https://img.shields.io/badge/Groq-LLaMA--3-f55036?style=flat-square)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?style=flat-square&logo=huggingface&logoColor=black)
![Google AI](https://img.shields.io/badge/Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white)
![OAuth2](https://img.shields.io/badge/OAuth2-Google_%26_GitHub-eb4034?style=flat-square)

---

**Calyx AI** is a premium, full-stack AI ecosystem designed for speed, beauty, and intelligence. It brings together state-of-the-art LLMs, Image Generation, Voice AI, and Live Web Search into a single, unified glassmorphic interface.

---

## 🌟 Key Features

### 🤖 Intelligent Core
- **Advanced Chat:** Powered by LLaMA 3.3 (70B) via Groq for sub-second responses.
- **Multimodal Uploads:** Attach images or documents directly in the chat.
- **Context Aware:** Full conversation history managed via **Supabase**.

### 🎨 Creative Tools
- **Image Generation:** Stable Diffusion XL integration for high-fidelity visual creation.
- **Cinematic UI:** Premium glassmorphic design with smooth micro-animations.

### 🎙️ Voice & Search
- **Voice AI:** Real-time speech-to-text and professional Edge TTS narration.
- **Live Search:** Real-time web search integration for up-to-date information.

### 🔐 Security & Reliability
- **OAuth 2.0:** Secure login via Google and GitHub.
- **Cloud Persistence:** Your data is safe in the cloud with Supabase DB & Storage.

---

## 🏗️ Architecture

Calyx AI is split into two specialized repositories:

### 📱 [Frontend (React)](./Frontend)
- **Framework:** React 18 + Vite
- **Styling:** Vanilla CSS + Modern Design Tokens
- **State:** React Context & Hooks
- **Icons:** Lucide React & Boxicons

### ⚙️ [Backend (Flask)](./Backend)
- **Framework:** Python Flask
- **DB/Storage:** Supabase
- **AI Models:** Groq (LLaMA), HuggingFace (SDXL), Gemini (Web Search)
- **Auth:** JWT + OAuth 2.0

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
pip install -r Requirements.txt
# Configure your .env
python server.py
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
```

---

## ☁️ Deployment

- **Frontend:** Optimized for **Vercel** or Netlify.
- **Backend:** Configured for **Render** via `gunicorn`.
- **Database:** Fully integrated with **Supabase**.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by **Ayush Chavan**
