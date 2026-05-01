<div align="center">
  <img src="https://img.shields.io/badge/CALYX%20AI-Backend-7c3aed?style=for-the-badge&logo=python&logoColor=white" alt="CALYX AI Backend" />
  <br/><br/>

  ![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)
  ![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)
  ![Groq](https://img.shields.io/badge/Groq-LLaMA_3-f55036?style=flat-square)
  ![Google AI](https://img.shields.io/badge/Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white)
  ![Stable Diffusion](https://img.shields.io/badge/Stable_Diffusion-XL-ff6b35?style=flat-square)
  ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
</div>

<br/>

# 🔮 CALYX AI — Backend API Server

> The intelligence engine powering CALYX AI — a full-featured AI assistant platform supporting multi-turn chat, image generation, real-time voice, and web search.

---

## ✨ Features

| Module | Description |
|---|---|
| 🤖 **AI Chat** | LLaMA 3.3 70B via Groq — blazing-fast responses with conversation memory |
| 🎨 **Image Generation** | Stable Diffusion XL via Hugging Face Inference API |
| 🎙️ **Voice** | Real-time Speech-to-Text + Edge TTS text-to-speech |
| 🔍 **Web Search** | Live internet search integrated into AI responses |
| 🔐 **Auth** | JWT sessions + Google OAuth 2.0 |
| 🛡️ **Rate Limiting** | Per-user request throttling via Flask-Limiter |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- pip

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/calyx-ai-backend.git
cd calyx-ai-backend

# 2. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# 3. Install dependencies
pip install -r Requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 5. Run the server
python server.py
```

Server starts at **http://localhost:5000**

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required | Source |
|---|---|---|
| `GroqAPIKey` | ✅ | [console.groq.com](https://console.groq.com) |
| `GOOGLE_CLIENT_ID` | ✅ | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | ✅ | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `HuggingFaceAPIKey` | ✅ | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com) |
| `CohereAPIKey` | ⚡ Optional | [cohere.com](https://cohere.com) |
| `JWT_SECRET` | ✅ | Any long random string (32+ chars) |
| `FRONTEND_URL` | ✅ | Your frontend URL (e.g. `https://calyx.vercel.app`) |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/signin` | Email/password login |
| `GET` | `/api/auth/google` | Google OAuth redirect |
| `GET` | `/api/auth/google/callback` | Google OAuth callback |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send message, get AI response |
| `GET` | `/api/conversations` | List user conversations |
| `GET` | `/api/conversations/:id` | Get conversation history |
| `DELETE` | `/api/conversations/:id` | Delete conversation |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/image/generate` | Generate image from prompt |
| `POST` | `/api/voice/transcribe` | Speech to text |
| `POST` | `/api/voice/tts` | Text to speech |
| `GET` | `/api/health` | Server health check |

---

## 🏗️ Project Structure

```
calyx-ai-backend/
├── server.py              # Main Flask app & all API routes
├── Requirements.txt       # Python dependencies
├── render.yaml           # Render deployment config
├── .env.example          # Environment template
└── Backend 1/
    ├── Chatbot.py         # LLM integration (Groq/Gemini)
    ├── ImageGeneration.py # Stable Diffusion via HuggingFace
    ├── RealtimeSearchEngine.py # Live web search
    ├── SpeechToText.py    # Voice transcription
    ├── TextToSpeech.py    # Edge TTS
    └── Model.py           # Decision/routing model
```

---

## ☁️ Deploy to Render (Free)

1. Fork this repository
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your fork
4. Add all environment variables in Render dashboard
5. Deploy — your API will be at `https://calyx-ai-backend.onrender.com`

> **Note:** Free tier spins down after 15min of inactivity. First request may take ~30s to wake up.

### Google OAuth Setup for Production
In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add to **Authorized Redirect URIs**:
```
https://calyx-ai-backend.onrender.com/api/auth/google/callback
```

---

## 🔗 Related

- **Frontend:** [calyx-ai-frontend](https://github.com/YOUR_USERNAME/calyx-ai-frontend) — React + Vite

---

## 📄 License

MIT © 2025 Ayush Chavan
