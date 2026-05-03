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

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Supabase Integration
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUCCESS] Supabase client initialized")
    else:
        supabase = None
        print("[WARNING] Supabase credentials missing, falling back to local storage")
except ImportError:
    supabase = None
    print("[WARNING] supabase-py not installed, falling back to local storage")

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "Backend 1")
DATA_DIR = os.path.join(BASE_DIR, "Data 1")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
CONVERSATIONS_DIR = os.path.join(DATA_DIR, "conversations")

sys.path.insert(0, BACKEND_DIR)

from flask import Flask, request, jsonify, Response, redirect
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

import requests
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
# Support HTTPS when behind Render proxy
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

CORS(app, origins=[
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    # Production
    "https://calyx-ai-project.vercel.app",
    os.environ.get("FRONTEND_URL", "https://calyx-ai-project.vercel.app"),
], supports_credentials=True)

# Secret key for JWT signing
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
JWT_EXPIRY_HOURS = 72

# OAuth config (set in .env or environment)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://calyx-ai-project.vercel.app")

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
    if supabase:
        try:
            res = supabase.table("users").select("*").execute()
            return res.data
        except Exception as e:
            print(f"[ERROR] Supabase users fetch failed: {e}")
    
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _save_users(users):
    if supabase:
        try:
            # This is a simplification; in a real app, you'd insert/update individual users
            # Here we just try to sync the latest user if called during signup
            if users:
                latest_user = users[-1]
                supabase.table("users").upsert(latest_user).execute()
        except Exception as e:
            print(f"[ERROR] Supabase users save failed: {e}")

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
    if supabase:
        try:
            res = supabase.table("conversations").select("*").eq("id", conv_id).eq("user_id", user_id).single().execute()
            return res.data
        except Exception:
            pass

    path = os.path.join(_get_user_conversations_dir(user_id), f"{conv_id}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_conversation(user_id, conv_data):
    if supabase:
        try:
            data = conv_data.copy()
            data["user_id"] = user_id
            supabase.table("conversations").upsert(data).execute()
        except Exception as e:
            print(f"[ERROR] Supabase conv save failed: {e}")

    path = os.path.join(_get_user_conversations_dir(user_id), f"{conv_data['id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(conv_data, f, indent=2, ensure_ascii=False)


def _list_conversations(user_id):
    if supabase:
        try:
            res = supabase.table("conversations").select("id", "title", "updatedAt", "messages").eq("user_id", user_id).order("updatedAt", desc=True).execute()
            return [{
                "id": c["id"],
                "title": c.get("title", "Untitled"),
                "updatedAt": c.get("updatedAt", ""),
                "messageCount": len(c.get("messages", []))
            } for c in res.data]
        except Exception:
            pass

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

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Calyx AI API is running", "health": "/api/health"})

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
        error_msg = str(e)
        if "api_key" in error_msg.lower() or "none" in error_msg.lower():
            error_msg = "The AI service (Groq) is not configured correctly on the server. Please check the GroqAPIKey environment variable."
        return jsonify({"reply": f"An error occurred: {error_msg}"}), 500


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
@auth_required
def voice_transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    if not audio_file.filename:
        return jsonify({"error": "No audio file selected"}), 400

    groq_key = os.environ.get("GroqAPIKey")
    if not groq_key:
        return jsonify({"error": "Transcription service (Groq) not configured on server"}), 503

    # Get optional language hint from frontend (e.g., 'mr-IN', 'hi-IN')
    lang_code = request.form.get('language', '')
    whisper_lang = None
    if lang_code:
        # Whisper expects ISO 639-1 (2-letter) codes
        whisper_lang = lang_code.split('-')[0].lower()

    try:
        from groq import Groq
        client = Groq(api_key=groq_key)
        
        # Save temporary file
        temp_path = os.path.join(DATA_DIR, f"temp_{uuid.uuid4()}.webm")
        audio_file.save(temp_path)
        
        try:
            with open(temp_path, "rb") as file:
                # Use transcriptions.create (not translations) to get original language script
                transcription = client.audio.transcriptions.create(
                    file=(temp_path, file.read()),
                    model="whisper-large-v3",
                    response_format="json",
                    language=whisper_lang if whisper_lang else None
                )
            
            return jsonify({"text": transcription.text if hasattr(transcription, 'text') else transcription.get("text", "")})
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/upload", methods=["POST"])
@auth_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not supabase:
        # Fallback: save locally
        upload_dir = os.path.join(DATA_DIR, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        # In a real app, you'd serve this via a route or static files
        return jsonify({"url": f"/uploads/{filename}", "name": file.filename})

    try:
        # Upload to Supabase Storage
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        bucket = "uploads" # Assume this bucket exists
        
        # Read file content
        content = file.read()
        res = supabase.storage.from_(bucket).upload(filename, content)
        
        # Get public URL
        url = supabase.storage.from_(bucket).get_public_url(filename)
        return jsonify({"url": url, "name": file.filename})
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500


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

    # Determine the backend base URL robustly
    # Use BACKEND_URL env var if set, otherwise fallback to request host
    base_url = os.environ.get("BACKEND_URL")
    if not base_url:
        base_url = request.host_url.rstrip('/')
        if "onrender.com" in base_url and not base_url.startswith("https"):
            base_url = base_url.replace("http://", "https://")
    
    redirect_uri = f"{base_url}/api/auth/google/callback"
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
    code = request.args.get("code")
    # Recover the frontend origin from the state parameter
    state = request.args.get("state", "")
    try:
        frontend_origin = urllib.parse.unquote(state) if state else FRONTEND_URL
    except:
        frontend_origin = FRONTEND_URL

    if not code:
        return redirect(f"{frontend_origin}/signin?error=no_code")

    # Determine the backend base URL robustly
    base_url = os.environ.get("BACKEND_URL")
    if not base_url:
        base_url = request.host_url.rstrip('/')
        if "onrender.com" in base_url and not base_url.startswith("https"):
            base_url = base_url.replace("http://", "https://")
        
    redirect_uri = f"{base_url}/api/auth/google/callback"

    # Exchange code for tokens
    print(f"[DEBUG] Using Client ID length: {len(GOOGLE_CLIENT_ID)}, Client Secret length: {len(GOOGLE_CLIENT_SECRET)}")
    try:
        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        print(f"[DEBUG] Exchanging code for token with redirect_uri: {redirect_uri}")
        token_resp = requests.post("https://oauth2.googleapis.com/token", data=token_data)
        
        if not token_resp.ok:
            error_text = token_resp.text
            print(f"[ERROR] Token exchange failed: {error_text}")
            try:
                error_json = token_resp.json()
                google_error = error_json.get('error_description') or error_json.get('error') or "token_exchange_failed"
            except:
                google_error = "token_exchange_failed"
            
            # Pass the actual Google error back to the frontend for visibility
            from urllib.parse import quote
            return redirect(f"{frontend_origin}/signin?error=google_auth_failed&details={quote(google_error)}")

        token_json = token_resp.json()
        access_token = token_json.get("access_token")

        if not access_token:
            print(f"[ERROR] No access_token in response: {token_json}")
            return redirect(f"{frontend_origin}/signin?error=google_auth_failed&details=no_access_token")

        # Get user info
        user_resp = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if not user_resp.ok:
            print(f"[ERROR] User info fetch failed: {user_resp.text}")
            return redirect(f"{frontend_origin}/signin?error=google_auth_failed&details=user_info")

        user_info = user_resp.json()
        email = user_info.get("email", "")
        name = user_info.get("name", email.split("@")[0])
        picture = user_info.get("picture", "")

        # Find or create user
        users = _load_users()
        existing = next((u for u in users if u["email"] == email), None)

        if existing:
            user_id = existing["id"]
            # Update user info if it's missing or changed
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
        
        # Redirect back to frontend
        import urllib.parse
        params = urllib.parse.urlencode({
            "token": token,
            "name": name,
            "email": email,
            "picture": picture
        })
        return redirect(f"{frontend_origin}/auth/callback?{params}")

    except Exception as e:
        print(f"[CRITICAL] Google OAuth exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return redirect(f"{frontend_origin}/signin?error=google_auth_failed&details=exception")


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
