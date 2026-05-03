import os
import google.generativeai as genai
import cohere
import datetime
from json import load, dump
from groq import Groq
from googlesearch import search
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get absolute path to project root (Elon - Copy directory)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, "Data 1")
_CHATLOG_PATH = os.path.join(_DATA_DIR, "ChatLog.json")

# Use os.environ instead of .env file for production
Username = os.environ.get("Username", "User")
Assistantname = os.environ.get("Assistantname", "CALYX")
GroqAPIKey = os.environ.get("GroqAPIKey")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
CohereAPIKey = os.environ.get("CohereAPIKey")

# ── Primary Client: Groq ──────────────────────────────────
client = None
if GroqAPIKey:
    try:
        client = Groq(api_key=GroqAPIKey)
    except Exception as e:
        print(f"[ERROR] Groq initialization failed: {e}")

# ── Fallback Client 1: Gemini ──────────────────────────────
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[ERROR] Gemini initialization failed: {e}")

# ── Fallback Client 2: Cohere ──────────────────────────────
co = None
if CohereAPIKey:
    try:
        co = cohere.Client(api_key=CohereAPIKey)
    except Exception as e:
        print(f"[ERROR] Cohere initialization failed: {e}")

def is_client_active():
    """Check if at least one AI client is configured."""
    return any([client, GEMINI_API_KEY, co])

# Ensure data directory exists
os.makedirs(_DATA_DIR, exist_ok=True)

# ── System Prompt ────────────────────────────────────────────
System = f"""You are {Assistantname}, a highly intelligent, accurate, and helpful AI assistant created for {Username}.

You have FULL real-time internet access. Web search results are provided to you automatically.

ABSOLUTE RULES (never break these):
1. NEVER say "as of my knowledge cutoff", "as of my last update", "as my knowledge", "I don't have real-time access", or anything similar — YOU HAVE REAL-TIME ACCESS
2. NEVER say "I cannot browse the internet" — you CAN, results are provided to you
3. When web search results are provided, treat them as GROUND TRUTH and use them to answer
4. Be concise and direct — answer the question without unnecessary disclaimers
5. Use proper grammar, punctuation, and formatting
6. Reply in English only
7. Format responses with markdown when helpful (bold, lists, code blocks)
8. If you don't know something and no web results are provided, say "Let me look that up" — NEVER blame training data

Current date: {datetime.datetime.now().strftime('%B %d, %Y')}
"""

# ── Helper: Get real-time date/time info ─────────────────────
def _get_realtime_info():
    now = datetime.datetime.now()
    return (
        f"Current date & time: {now.strftime('%A, %B %d, %Y at %I:%M %p')}\n"
        f"Year: {now.year}\n"
    )

# ── Helper: Decide if a query needs web search ──────────────
_REALTIME_KEYWORDS = [
    "latest", "recent", "current", "today", "now", "news", "update",
    "2024", "2025", "2026", "new", "price", "stock", "weather",
    "score", "match", "election", "president", "prime minister",
    "trending", "release", "launched", "announce", "who is", "who are",
    "what happened", "how much", "worth", "net worth", "salary",
    "ceo", "founder", "owner", "buy", "cost", "vs",
]

def _needs_web_search(query: str) -> bool:
    q_lower = query.lower()
    for keyword in _REALTIME_KEYWORDS:
        if keyword in q_lower:
            return True
    words = query.split()
    proper_nouns = [w for w in words[1:] if w[0].isupper() and len(w) > 1] if len(words) > 1 else []
    if len(proper_nouns) >= 1:
        return True
    return False

# ── Helper: Web search ──────────────────────────────────────
def _web_search(query: str, num_results: int = 5) -> str:
    try:
        results = list(search(query, advanced=True, num_results=num_results))
        if not results:
            return ""
        text = f"Web search results for '{query}':\n\n"
        for i, r in enumerate(results, 1):
            text += f"{i}. {r.title}\n   {r.description}\n\n"
        return text
    except Exception as e:
        print(f"[WARNING] Web search failed: {e}")
        return ""

# ── Helper: Self-check ───────────────────────────────────────
_SELF_CHECK_PROMPT = """You just answered a user's question. Review your answer and decide:
- Does your answer contain potentially outdated information?
- Could the answer be wrong because you lack recent data?
- Is there a factual claim that should be verified?

If YES to any of these, respond with EXACTLY: SEARCH: <search query to verify>
If NO (the answer is fine as-is), respond with EXACTLY: OK

Only respond with one line — either "SEARCH: ..." or "OK". Nothing else."""

def _self_check_answer(query: str, answer: str) -> str:
    if not client: return ""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _SELF_CHECK_PROMPT},
                {"role": "user", "content": f"User asked: {query}\n\nYour answer was: {answer}"},
            ],
            max_tokens=100,
            temperature=0.1,
        )
        result = response.choices[0].message.content.strip()
        if result.startswith("SEARCH:"):
            return result[7:].strip()
        return ""
    except Exception:
        return ""

def AnswerModifier(Answer):
    lines = Answer.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    modified_answer = '\n'.join(non_empty_lines)
    return modified_answer

def ChatBot(Query, history=None):
    """Smart chatbot that automatically searches the web when needed."""
    if not is_client_active():
        return "The AI services are not configured correctly. Please ensure GroqAPIKey, GEMINI_API_KEY, or CohereAPIKey are set."

    try:
        if history is not None:
            messages = []
            for m in history:
                messages.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
        else:
            try:
                with open(_CHATLOG_PATH, "r") as f:
                    messages = load(f)
            except:
                messages = []

        if len(messages) > 40:
            messages = messages[-40:]

        messages.append({"role": "user", "content": Query})

        web_context = ""
        if _needs_web_search(Query):
            print(f"🔍 Auto-searching web for: {Query}")
            web_context = _web_search(Query)

        Answer = ""
        # ── Step 1: Try Groq (Primary) ──────────────────────
        if client:
            try:
                system_messages = [
                    {"role": "system", "content": System},
                    {"role": "system", "content": _get_realtime_info()},
                ]
                if web_context:
                    system_messages.append({"role": "system", "content": f"Web Context:\n{web_context}"})

                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=system_messages + messages,
                    max_tokens=2048,
                    temperature=0.7,
                    stream=True
                )
                for chunk in completion:
                    if chunk.choices[0].delta.content:
                        Answer += chunk.choices[0].delta.content
                Answer = Answer.replace("</s>", "")
            except Exception as e:
                print(f"[FALLBACK] Groq failed: {e}")
                Answer = ""

        # ── Step 2: Try Gemini (Fallback 1) ─────────────────
        if not Answer and GEMINI_API_KEY:
            try:
                print("[INFO] Attempting Gemini fallback...")
                model = genai.GenerativeModel('gemini-1.5-flash')
                gemini_history = []
                for m in messages[:-1]:
                    role = "user" if m["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [m["content"]]})
                
                chat = model.start_chat(history=gemini_history)
                # Combine system prompt and context into a temporary context for the query
                context_query = f"{System}\n{_get_realtime_info()}\n"
                if web_context:
                    context_query += f"Web Context:\n{web_context}\n\n"
                context_query += f"User: {Query}"
                
                response = chat.send_message(context_query)
                Answer = response.text
            except Exception as e:
                print(f"[FALLBACK] Gemini failed: {e}")
                Answer = ""

        # ── Step 3: Try Cohere (Fallback 2) ─────────────────
        if not Answer and co:
            try:
                print("[INFO] Attempting Cohere fallback...")
                co_history = []
                for m in messages[:-1]:
                    role = "USER" if m["role"] == "user" else "CHATBOT"
                    co_history.append({"role": role, "message": m["content"]})
                
                co_res = co.chat(
                    model='command-r-plus',
                    message=Query,
                    chat_history=co_history,
                    preamble=System + "\n" + (web_context if web_context else "")
                )
                Answer = co_res.text
            except Exception as e:
                print(f"[CRITICAL] Cohere failed: {e}")
                Answer = ""

        if not Answer:
            return "I apologize, but all my AI services (Groq, Gemini, and Cohere) are currently unavailable. Please check your API keys."

        # Self-check logic (optional)
        if not web_context and client:
            try:
                search_query = _self_check_answer(Query, Answer)
                if search_query:
                    # For simplicity, we don't re-run the whole fallback chain here
                    pass
            except: pass

        messages.append({"role": "assistant", "content": Answer})
        if history is None:
            with open(_CHATLOG_PATH, "w") as f:
                dump(messages, f, indent=4)

        return AnswerModifier(Answer=Answer)

    except Exception as e:
        print(f"ChatBot Error: {e}")
        return f"An error occurred: {str(e)}"

if __name__ == "__main__":
    while True:
        user_input = input("Enter Your Question: ")
        print(ChatBot(user_input))
