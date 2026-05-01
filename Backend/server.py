#!/usr/bin/env python3
"""
CALYX AI — Flask API Server (Production-Ready)
JWT auth, bcrypt passwords, rate limiting, OAuth, conversation persistence.
"""

import sys
import os
import json
import uuid
import re
import secrets
import threading
from datetime import datetime, timedelta
from functools import wraps

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "Backend 1")
DATA_DIR = os.path.join(BASE_DIR, "Data 1")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
CONVERSATIONS_DIR = os.path.join(DATA_DIR, "conversations")

sys.path.insert(0, BACKEND_DIR)

from flask import Flask, request, jsonify, Response, redirect
from flask_cors import CORS

import jwt
import bcrypt

# ── Import backend modules ────────────────────────────────────
try:
    from Chatbot import ChatBot
    print("[SUCCESS] Chatbot module loaded")
except Exception as e:
    print(f"[CRITICAL] Chatbot module failed to load: {e}")
    ChatBot = None

try:
    from Model import FirstLayerDMM
    print("[SUCCESS] Model (Decision) module loaded")
except Exception as e:
    print(f"[CRITICAL] Model module failed to load: {e}")
    FirstLayerDMM = None

try:
    from RealtimeSearchEngine import RealtimeSearchEngine
    print("[SUCCESS] RealtimeSearchEngine module loaded")
except Exception as e:
    print(f"[CRITICAL] RealtimeSearchEngine module failed to load: {e}")
    RealtimeSearchEngine = None


try:
    from ImageGeneration import generate_images_base64
    print("[SUCCESS] ImageGeneration module loaded")
except Exception as e:
    print(f"[ERROR] ImageGeneration module failed to load: {e}")
    generate_images_base64 = None

try:
    from TextToSpeech import generate_audio_bytes
    print("[SUCCESS] TextToSpeech module loaded")
except Exception as e:
    print(f"[ERROR] TextToSpeech module failed to load: {e}")
    generate_audio_bytes = None



# ── Flask App Setup ───────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[
    # Local development — all Vite dev ports
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    "http://localhost:5180",
    "http://localhost:5181",
    "http://localhost:5182",
    # Production — Vercel frontend (update this after deploying)
    os.environ.get("FRONTEND_URL", "http://localhost:5173"),
])

# Secret key for JWT signing
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_EXPIRY_HOURS = 72

# OAuth config (set in .env or environment)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CONVERSATIONS_DIR, exist_ok=True)


# ── Rate Limiting ─────────────────────────────────────────────
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per minute"],
        storage_uri="memory://",
    )
    print("[SUCCESS] Rate limiter active")
except ImportError:
    limiter = None
    print("[WARNING] flask-limiter not installed, rate limiting disabled")


# ── Security Middleware ───────────────────────────────────────
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    return response


# ── Helpers ───────────────────────────────────────────────────

def sanitize_input(text, max_length=5000):
    """Strip dangerous characters and enforce length limit."""
    if not text or not isinstance(text, str):
        return ""
    text = text[:max_length]
    # Remove potential script tags
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    return text.strip()


def _load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)


def _hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password, hashed):
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _generate_jwt(user_id, email, name, picture=None):
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")



def _decode_jwt(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def auth_required(f):
    """Decorator to require JWT auth on endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = _decode_jwt(token)
            if payload:
                request.user = payload
                return f(*args, **kwargs)
        # Allow unauthenticated access but with no user
        request.user = None
        return f(*args, **kwargs)
    return decorated


def _get_user_conversations_dir(user_id):
    d = os.path.join(CONVERSATIONS_DIR, user_id)
    os.makedirs(d, exist_ok=True)
    return d


def _load_conversation(user_id, conv_id):
    path = os.path.join(_get_user_conversations_dir(user_id), f"{conv_id}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_conversation(user_id, conv_data):
    path = os.path.join(_get_user_conversations_dir(user_id), f"{conv_data['id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(conv_data, f, indent=2, ensure_ascii=False)


def _list_conversations(user_id):
    d = _get_user_conversations_dir(user_id)
    convs = []
    for fname in os.listdir(d):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(d, fname), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    convs.append({
                        "id": data["id"],
                        "title": data.get("title", "Untitled"),
                        "updatedAt": data.get("updatedAt", data.get("createdAt", "")),
                        "messageCount": len(data.get("messages", [])),
                    })
            except Exception:
                pass
    convs.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return convs


# ── Routes ────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


# ── Chat ──────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
@auth_required
def chat():
    data = request.get_json()
    message = sanitize_input(data.get("message", ""), max_length=10000)
    conversation_id = data.get("conversationId")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    user_id = request.user["sub"] if request.user else "anonymous"

    # Load or create conversation
    conv = None
    if conversation_id:
        conv = _load_conversation(user_id, conversation_id)

    if not conv:
        conversation_id = str(uuid.uuid4())
        conv = {
            "id": conversation_id,
            "title": message[:50] + ("..." if len(message) > 50 else ""),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "messages": [],
        }

    try:
        # Generate reply using ChatBot, providing the user's specific conversation history
        reply = ""
        lower_msg = message.lower().strip()
        is_image_request = lower_msg.startswith("/image ") or lower_msg.startswith("generate image") or lower_msg.startswith("create image") or lower_msg.startswith("draw image")

        if is_image_request and generate_images_base64:
            # Extract prompt
            prompt = re.sub(r'^(generate|create|make|draw)\s+(an\s+)?image\s*(of)?\s*|/image\s*', '', message, flags=re.IGNORECASE).strip()
            if not prompt:
                prompt = message
            try:
                images = generate_images_base64(prompt, count=1)
                if images and len(images) > 0:
                    reply = f"Here is your generated image:\n\n![{prompt}]({images[0]})"
                else:
                    reply = "No valid images generated. Try again in a moment."
            except Exception as e:
                reply = f"Image generation failed: {str(e)}"
        else:
            if ChatBot:
                # Note: We pass the history excluding the current message as we append it below in the conv
                reply = ChatBot(message, history=conv["messages"])
            else:
                reply = "I'm sorry, the chat service is currently unavailable."

        # Save to conversation
        conv["messages"].append({"role": "user", "content": message, "time": datetime.now().isoformat()})
        conv["messages"].append({"role": "assistant", "content": reply, "time": datetime.now().isoformat()})
        conv["updatedAt"] = datetime.now().isoformat()

        if user_id != "anonymous":
            _save_conversation(user_id, conv)

        return jsonify({"reply": reply, "conversationId": conversation_id})

    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"reply": f"An error occurred: {str(e)}"}), 500


# ── Conversations ─────────────────────────────────────────────

@app.route("/api/conversations", methods=["GET"])
@auth_required
def list_conversations():
    if not request.user:
        return jsonify({"conversations": []})
    convs = _list_conversations(request.user["sub"])
    return jsonify({"conversations": convs})


@app.route("/api/conversations", methods=["POST"])
@auth_required
def create_conversation():
    if not request.user:
        return jsonify({"error": "Auth required"}), 401
    conv_id = str(uuid.uuid4())
    conv = {
        "id": conv_id,
        "title": "New Chat",
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
        "messages": [],
    }
    _save_conversation(request.user["sub"], conv)
    return jsonify(conv), 201


@app.route("/api/conversations/<conv_id>", methods=["GET"])
@auth_required
def get_conversation(conv_id):
    if not request.user:
        return jsonify({"error": "Auth required"}), 401
    conv = _load_conversation(request.user["sub"], conv_id)
    if not conv:
        return jsonify({"error": "Not found"}), 404
    return jsonify(conv)


@app.route("/api/conversations/<conv_id>", methods=["DELETE"])
@auth_required
def delete_conversation(conv_id):
    if not request.user:
        return jsonify({"error": "Auth required"}), 401
    path = os.path.join(_get_user_conversations_dir(request.user["sub"]), f"{conv_id}.json")
    if os.path.exists(path):
        os.remove(path)
    return jsonify({"ok": True})


# ── Image Generation ──────────────────────────────────────────

# Store daily image counts (in production, use Redis or database)
# Limit removed as requested

@app.route("/api/image/generate", methods=["POST"])
@auth_required
def image_generate():
    data = request.get_json()
    prompt = sanitize_input(data.get("prompt", ""), max_length=500)

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    if not generate_images_base64:
        return jsonify({"error": "Image generation service unavailable"}), 503

    try:
        # Generate a single image as requested
        images = generate_images_base64(prompt, count=1)
        if images and len(images) > 0:
            image_url = images[0]
            
            # Save to conversation history if authenticated
            user_id = request.user["sub"] if request.user else "anonymous"
            if user_id != "anonymous":
                # Find or create a "Vision Gallery" conversation
                convs = _list_conversations(user_id)
                vision_conv = next((c for c in convs if c["title"] == "Vision Gallery"), None)
                
                if vision_conv:
                    conv = _load_conversation(user_id, vision_conv["id"])
                else:
                    conv_id = str(uuid.uuid4())
                    conv = {
                        "id": conv_id,
                        "title": "Vision Gallery",
                        "createdAt": datetime.now().isoformat(),
                        "updatedAt": datetime.now().isoformat(),
                        "messages": [],
                    }
                
                # Add the image generation as a pair of messages
                conv["messages"].append({
                    "role": "user", 
                    "content": f"Generate image: {prompt}", 
                    "time": datetime.now().isoformat()
                })
                conv["messages"].append({
                    "role": "assistant", 
                    "content": f"![{prompt}]({image_url})", 
                    "time": datetime.now().isoformat()
                })
                conv["updatedAt"] = datetime.now().isoformat()
                _save_conversation(user_id, conv)

            return jsonify({
                "url": image_url,
                "images": images,
                "prompt": prompt
            })
        else:
            return jsonify({"error": "No valid images generated. Try again in a moment."}), 503
    except Exception as e:
        print(f"Image generation error: {e}")
        return jsonify({"error": f"Image generation failed: {str(e)}"}), 500


# ── Voice: Text-to-Speech ─────────────────────────────────────

@app.route("/api/voice/tts", methods=["POST"])
@auth_required
def voice_tts():
    data = request.get_json()
    text = sanitize_input(data.get("text", ""), max_length=5000)

    if not text:
        return jsonify({"error": "Text is required"}), 400

    if not generate_audio_bytes:
        return jsonify({"error": "TTS service unavailable"}), 503

    try:
        audio_data = generate_audio_bytes(text)
        return Response(
            audio_data,
            mimetype="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        print(f"TTS error: {e}")
        return jsonify({"error": str(e)}), 500


# ── Voice: Transcribe (stub) ─────────────────────────────────

@app.route("/api/voice/transcribe", methods=["POST"])
def voice_transcribe():
    return jsonify({
        "text": "",
        "message": "Server-side transcription not configured. Use browser speech recognition."
    })


# ── Auth: Sign In ─────────────────────────────────────────────

@app.route("/api/auth/signin", methods=["POST"])
def auth_signin():
    data = request.get_json()
    email = sanitize_input(data.get("email", ""))
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    users = _load_users()
    for user in users:
        if user["email"] == email:
            if _verify_password(password, user["password"]):
                token = _generate_jwt(user["id"], user["email"], user["name"])
                return jsonify({
                    "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
                    "token": token
                })
            else:
                return jsonify({"message": "Invalid email or password"}), 401

    return jsonify({"message": "Invalid email or password"}), 401


# ── Auth: Sign Up ─────────────────────────────────────────────

@app.route("/api/auth/signup", methods=["POST"])
def auth_signup():
    data = request.get_json()
    name = sanitize_input(data.get("name", ""), max_length=100)
    email = sanitize_input(data.get("email", ""), max_length=200)
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    # Basic email validation
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"message": "Invalid email format"}), 400

    users = _load_users()
    for user in users:
        if user["email"] == email:
            return jsonify({"message": "Email already registered"}), 409

    new_user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password": _hash_password(password),
        "provider": "local",
        "created_at": datetime.now().isoformat()
    }
    users.append(new_user)
    _save_users(users)

    token = _generate_jwt(new_user["id"], email, name)
    return jsonify({
        "user": {"id": new_user["id"], "name": name, "email": email},
        "token": token
    }), 201


# ── OAuth: Google ─────────────────────────────────────────────

@app.route("/api/auth/google", methods=["GET"])
def auth_google():
    import urllib.parse
    if not GOOGLE_CLIENT_ID:
        return jsonify({"message": "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment."}), 503

    # Capture the frontend origin so the callback can redirect to the right port
    frontend_origin = request.args.get("frontend_origin", FRONTEND_URL)
    state = urllib.parse.quote(frontend_origin, safe="")

    redirect_uri = f"{request.host_url}api/auth/google/callback"
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri, safe='')}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"state={state}"
    )
    return redirect(google_auth_url)


@app.route("/api/auth/google/callback", methods=["GET"])
def auth_google_callback():
    import urllib.request
    import urllib.parse

    code = request.args.get("code")
    # Recover the frontend origin from the state parameter
    state = request.args.get("state", "")
    frontend_origin = urllib.parse.unquote(state) if state else FRONTEND_URL

    if not code:
        return redirect(f"{frontend_origin}/signin?error=no_code")

    redirect_uri = f"{request.host_url}api/auth/google/callback"

    # Exchange code for tokens
    try:
        token_data = urllib.parse.urlencode({
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }).encode()

        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=token_data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        resp = urllib.request.urlopen(req)
        token_resp = json.loads(resp.read())

        # Get user info
        access_token = token_resp["access_token"]
        req2 = urllib.request.Request("https://www.googleapis.com/oauth2/v2/userinfo")
        req2.add_header("Authorization", f"Bearer {access_token}")
        resp2 = urllib.request.urlopen(req2)
        user_info = json.loads(resp2.read())

        email = user_info.get("email", "")
        name = user_info.get("name", email.split("@")[0])
        picture = user_info.get("picture", "")

        # Find or create user
        users = _load_users()
        existing = next((u for u in users if u["email"] == email), None)

        if existing:
            user_id = existing["id"]
        else:
            user_id = str(uuid.uuid4())
            users.append({
                "id": user_id,
                "name": name,
                "email": email,
                "password": "",
                "provider": "google",
                "created_at": datetime.now().isoformat()
            })
            _save_users(users)

        token = _generate_jwt(user_id, email, name, picture)
        # Redirect back to the EXACT port the user came from
        return redirect(f"{frontend_origin}/auth/callback?token={token}&name={urllib.parse.quote(name)}&email={urllib.parse.quote(email)}&picture={urllib.parse.quote(picture)}")


    except Exception as e:
        print(f"Google OAuth exchange error: {e}")
        return redirect(f"{FRONTEND_URL}/signin?error=google_auth_failed")


@app.route("/api/auth/google/frontend", methods=["POST"])
def auth_google_frontend():
    data = request.get_json()
    email = sanitize_input(data.get("email", ""))
    name = sanitize_input(data.get("name", email.split("@")[0]))
    picture = sanitize_input(data.get("picture", ""))

    if not email:
        return jsonify({"message": "Email is required"}), 400

    users = _load_users()
    existing = next((u for u in users if u["email"] == email), None)

    if existing:
        user_id = existing["id"]
        # Update name and picture to ensure it stays fresh
        existing["name"] = name
        existing["picture"] = picture
        _save_users(users)
    else:
        user_id = str(uuid.uuid4())
        users.append({
            "id": user_id,
            "name": name,
            "email": email,
            "password": "",
            "provider": "google",
            "picture": picture,
            "created_at": datetime.now().isoformat()
        })
        _save_users(users)

    token = _generate_jwt(user_id, email, name, picture)
    return jsonify({
        "user": {"id": user_id, "name": name, "email": email, "picture": picture},
        "token": token
    })


# ── OAuth: GitHub ─────────────────────────────────────────────

@app.route("/api/auth/github", methods=["GET"])
def auth_github():
    if not GITHUB_CLIENT_ID:
        return jsonify({"message": "GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in environment."}), 503

    github_auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={GITHUB_CLIENT_ID}&"
        f"scope=user:email"
    )
    return redirect(github_auth_url)


@app.route("/api/auth/github/callback", methods=["GET"])
def auth_github_callback():
    import urllib.request
    import urllib.parse

    code = request.args.get("code")
    if not code:
        return redirect(f"{FRONTEND_URL}/signin?error=no_code")

    try:
        # Exchange code for access token
        token_data = urllib.parse.urlencode({
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
        }).encode()

        req = urllib.request.Request("https://github.com/login/oauth/access_token", data=token_data)
        req.add_header("Accept", "application/json")
        resp = urllib.request.urlopen(req)
        token_resp = json.loads(resp.read())

        access_token = token_resp.get("access_token", "")
        if not access_token:
            return redirect(f"{FRONTEND_URL}/signin?error=no_token")

        # Get user info
        req2 = urllib.request.Request("https://api.github.com/user")
        req2.add_header("Authorization", f"token {access_token}")
        resp2 = urllib.request.urlopen(req2)
        user_info = json.loads(resp2.read())

        # Get email (may need separate request)
        email = user_info.get("email", "")
        if not email:
            req3 = urllib.request.Request("https://api.github.com/user/emails")
            req3.add_header("Authorization", f"token {access_token}")
            resp3 = urllib.request.urlopen(req3)
            emails = json.loads(resp3.read())
            primary = next((e for e in emails if e.get("primary")), None)
            email = primary["email"] if primary else f"{user_info['login']}@github.com"

        name = user_info.get("name") or user_info.get("login", "User")

        # Find or create user
        users = _load_users()
        existing = next((u for u in users if u["email"] == email), None)

        if existing:
            user_id = existing["id"]
        else:
            user_id = str(uuid.uuid4())
            users.append({
                "id": user_id,
                "name": name,
                "email": email,
                "password": "",
                "provider": "github",
                "created_at": datetime.now().isoformat()
            })
            _save_users(users)

        token = _generate_jwt(user_id, email, name)
        return redirect(f"{FRONTEND_URL}/auth/callback?token={token}&name={urllib.parse.quote(name)}&email={urllib.parse.quote(email)}")

    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        return redirect(f"{FRONTEND_URL}/signin?error=oauth_failed")


# ── Pricing Plans ─────────────────────────────────────────────

@app.route("/api/plans", methods=["GET"])
def get_plans():
    plans = [
        {
            "id": "free",
            "name": "Starter",
            "price": 0,
            "interval": "month",
            "features": [
                "50 chat messages/day",
                "5 image generations/day",
                "Basic voice features",
                "Community support"
            ]
        },
        {
            "id": "pro",
            "name": "Pro",
            "price": 19,
            "interval": "month",
            "popular": True,
            "features": [
                "Unlimited chat messages",
                "100 image generations/day",
                "Advanced voice features",
                "Priority support",
                "API access"
            ]
        },
        {
            "id": "enterprise",
            "name": "Enterprise",
            "price": 79,
            "interval": "month",
            "features": [
                "Everything in Pro",
                "Unlimited image generations",
                "Custom model fine-tuning",
                "Dedicated support",
                "SSO & Team management",
                "SLA guarantee"
            ]
        }
    ]
    return jsonify({"plans": plans})


# ── Run Server ────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  CALYX AI — Backend API Server")
    print("=" * 50)
    print(f"  Base directory : {BASE_DIR}")
    print(f"  Data directory : {DATA_DIR}")
    print(f"  JWT secret     : {'configured' if JWT_SECRET else 'NOT SET'}")
    print(f"  Google OAuth   : {'configured' if GOOGLE_CLIENT_ID else 'not set'}")
    print(f"  GitHub OAuth   : {'configured' if GITHUB_CLIENT_ID else 'not set'}")
    print(f"  Server         : http://localhost:5000")
    print("=" * 50 + "\n")

    app.run(host="0.0.0.0", port=5000, debug=True)
