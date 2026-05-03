<div align="center">
  <img src="https://img.shields.io/badge/CALYX%20AI-Backend-7c3aed?style=for-the-badge&logo=python&logoColor=white" alt="CALYX AI Backend" />
  <br/><br/>

  ![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python&logoColor=white)
  ![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=flat-square&logo=supabase&logoColor=white)
  ![Groq](https://img.shields.io/badge/Groq-LLaMA_3-f55036?style=flat-square)
  ![Google AI](https://img.shields.io/badge/Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white)
  ![Stable Diffusion](https://img.shields.io/badge/Stable_Diffusion-XL-ff6b35?style=flat-square)
  ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
</div>

<br/>

# 🔮 CALYX AI — Backend API Server

> The intelligence engine powering CALYX AI — a full-featured AI assistant platform supporting multi-turn chat, image generation, real-time voice, web search, and persistent cloud storage.

---

## ✨ Features

| Module | Description |
|---|---|
| 🤖 **AI Chat** | LLaMA 3.3 70B via Groq — blazing-fast responses with conversation memory |
| 🎨 **Image Generation** | Stable Diffusion XL via Hugging Face Inference API |
| 🎙️ **Voice** | Real-time Speech-to-Text + Edge TTS text-to-speech |
| 🔍 **Web Search** | Live internet search integrated into AI responses |
| 📂 **File Handling** | Multi-modal file uploads (images/docs) with persistent storage |
| 💾 **Cloud Database** | **Supabase Integration** for persistent users and chat history |
| 🔐 **Auth** | JWT sessions + **Google & GitHub OAuth 2.0** |
| 🛡️ **Rate Limiting** | Per-user request throttling via Flask-Limiter |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- pip
- [Supabase Project](https://supabase.com)

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
# Edit .env with your API keys, GitHub Secrets, and Supabase URL/Key

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
| `HuggingFaceAPIKey` | ✅ | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com) |
| `SUPABASE_URL` | ✅ | [Supabase Project API URL](https://supabase.com) |
| `SUPABASE_ANON_KEY` | ✅ | [Supabase Project Anon Key](https://supabase.com) |
| `GOOGLE_CLIENT_ID` | ✅ | [Google Cloud Console](https://console.cloud.google.com) |
| `GITHUB_CLIENT_ID` | ✅ | [GitHub Developer Settings](https://github.com/settings/developers) |
| `JWT_SECRET` | ✅ | Any long random string (32+ chars) |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/signin` | Email/password login |
| `GET` | `/api/auth/google` | Google OAuth redirect |
| `GET` | `/api/auth/github` | GitHub OAuth redirect |

### Chat & Storage
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send message, get AI response |
| `POST` | `/api/upload` | Upload files to Supabase Storage |
| `GET` | `/api/conversations` | List user conversations (via Supabase) |
| `GET` | `/api/conversations/:id` | Get conversation history |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/image/generate` | Generate image from prompt |
| `POST` | `/api/voice/transcribe` | Speech to text |
| `POST` | `/api/voice/tts` | Text to speech |

---

## 🏗️ Project Structure

```
calyx-ai-backend/
├── server.py              # Main Flask app & all API routes
├── Requirements.txt       # Python dependencies
├── .env                  # Private configuration
└── Backend 1/
    ├── Chatbot.py         # LLM integration (Groq/Gemini)
    ├── ImageGeneration.py # Stable Diffusion via HuggingFace
    ├── RealtimeSearchEngine.py # Live web search
    └── ...
```

---

## ☁️ Deployment

### Render Configuration
1. Connect your GitHub repository to **Render**.
2. Set the build command to `pip install -r Requirements.txt`.
3. Set the start command to `gunicorn server:app`.
4. Add all environment variables from `.env` to the Render Dashboard.

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL table setup (see `SUPABASE_GUIDE.md`).
3. Create a **Public** storage bucket named `uploads`.

---

## 📄 License

MIT © 2025 Ayush Chavan

