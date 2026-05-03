<div align="center">
  <img src="https://img.shields.io/badge/CALYX%20AI-Frontend-7c3aed?style=for-the-badge&logo=react&logoColor=white" alt="CALYX AI Frontend" />
  <br/><br/>

  ![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)
  ![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
  ![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-ff0055?style=flat-square&logo=framer&logoColor=white)
  ![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
</div>

<br/>

# 🔮 CALYX AI — Frontend

> A premium dark-themed AI assistant interface built with React, Vite, Framer Motion, and Tailwind CSS. Features multi-turn chat, image generation, voice interaction, and Google OAuth authentication.

---

## ✨ Pages & Features

| Page | Route | Description |
|---|---|---|
| 🏠 **Home** | `/` | Hero with looping background video, marquee, feature sections |
| 💬 **Chat** | `/chat` | Real-time AI chat with conversation history sidebar |
| 🎨 **Image Gen** | `/image` | AI image generation with gallery |
| 🎙️ **Voice** | `/voice` | Speech-to-text and TTS |
| 💎 **Pricing** | `/pricing` | Plans and features |
| 🔐 **Sign In** | `/signin` | Email/password + Google OAuth |
| 📝 **Sign Up** | `/signup` | Account creation |

### Design Highlights

- 🌑 Deep dark purple theme (`hsl(260, 87%, 3%)`)
- ✨ Glassmorphism UI panels
- 🎬 Framer Motion page transitions and micro-animations
- 📱 Fully responsive (mobile-first)
- 🔤 General Sans + Geist Sans typography

---

## 🚀 Quick Start (Local)

### Prerequisites

- Node.js 18+
- npm
- Backend running at `http://localhost:5000`

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/calyx-ai-frontend.git
cd calyx-ai-frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# .env is already set correctly for local dev (VITE_API_URL=/api)

# 4. Start development server
npm run dev
```

Frontend starts at **<http://localhost:5173>** (or next available port)

---

## 🔑 Environment Variables

| Variable | Local | Production |
|---|---|---|
| `VITE_API_URL` | `/api` | `https://calyx-ai-backend-wl72.onrender.com/api` |

> In local dev, Vite proxies `/api` calls to `http://localhost:5000` automatically.  
> In production (Vercel), set `VITE_API_URL` to your Render backend URL in the Vercel dashboard.

---

## 🏗️ Project Structure

```
calyx-ai-frontend/
├── index.html
├── vite.config.js         # Vite config with /api proxy
├── vercel.json            # SPA routing fix for Vercel
├── tailwind.config.js
├── .env.example
└── src/
    ├── App.jsx            # Routes setup
    ├── index.css          # Global styles + design tokens
    ├── main.jsx
    ├── components/
    │   ├── Navbar.jsx     # Auth-aware navigation
    │   └── Footer.jsx
    ├── context/
    │   └── AuthContext.jsx # JWT auth state management
    ├── pages/
    │   ├── Home.jsx       # Landing page with video hero
    │   ├── Chat.jsx       # Main chat interface
    │   ├── ImageGen.jsx   # AI image generation
    │   ├── Voice.jsx      # Voice interaction
    │   ├── Pricing.jsx    # Pricing plans
    │   ├── SignIn.jsx     # Login + Google OAuth
    │   ├── SignUp.jsx     # Registration
    │   └── AuthCallback.jsx # OAuth redirect handler
    └── services/
        └── api.js         # All backend API calls
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Framer Motion 12 | Animations & transitions |
| React Router 6 | Client-side routing |
| Lucide React | Icon library |
| Geist Sans | Body typeface |
| General Sans | Display typeface |

---

## ☁️ Deploy to Vercel (Free)

1. Fork this repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your fork
4. Configure:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add environment variable:
   - `VITE_API_URL` = `https://calyx-ai-backend-wl72.onrender.com/api`
6. Click **Deploy** ✅

### After Deploying — Update Google Cloud Console

Add your Vercel URL to **Authorized JavaScript Origins**:

```
https://your-calyx.vercel.app
```

---

## 🔗 Related

- **Backend:** [calyx-ai-backend](https://github.com/YOUR_USERNAME/calyx-ai-backend) — Flask + Python API

---

## 📸 Screenshots

> *Add screenshots of your app here after deployment*

---

## 📄 License

MIT © 2025 Ayush Chavan
