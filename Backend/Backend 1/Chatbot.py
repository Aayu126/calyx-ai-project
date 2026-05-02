from groq import Groq
from googlesearch import search
from json import load, dump
import datetime
from dotenv import dotenv_values
import os

# Get absolute path to project root (Elon - Copy directory)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, "Data 1")
_CHATLOG_PATH = os.path.join(_DATA_DIR, "ChatLog.json")

# Use os.environ instead of .env file for production
Username = os.environ.get("Username", "User")
Assistantname = os.environ.get("Assistantname", "CALYX")
GroqAPIKey = os.environ.get("GroqAPIKey")

# Initialize the Groq client safely
client = None
if GroqAPIKey:
    try:
        client = Groq(api_key=GroqAPIKey)
    except Exception as e:
        print(f"[ERROR] Groq initialization failed: {e}")
else:
    print("[WARNING] GroqAPIKey is missing. Chatbot will not function properly.")

def is_client_active():
    return client is not None


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
# Keywords/patterns that signal the query needs fresh, real-time data
_REALTIME_KEYWORDS = [
    "latest", "recent", "current", "today", "now", "news", "update",
    "2024", "2025", "2026", "new", "price", "stock", "weather",
    "score", "match", "election", "president", "prime minister",
    "trending", "release", "launched", "announce", "who is", "who are",
    "what happened", "how much", "worth", "net worth", "salary",
    "ceo", "founder", "owner", "buy", "cost", "vs",
]

def _needs_web_search(query: str) -> bool:
    """Detect if a query likely needs real-time web information."""
    q_lower = query.lower()

    # Check for realtime keywords
    for keyword in _REALTIME_KEYWORDS:
        if keyword in q_lower:
            return True

    # Check if query asks about a specific person, product, or event (proper nouns)
    words = query.split()
    # If there are capitalized words (proper nouns) that aren't at the sentence start
    proper_nouns = [w for w in words[1:] if w[0].isupper() and len(w) > 1] if len(words) > 1 else []
    if len(proper_nouns) >= 1:
        return True

    return False


# ── Helper: Web search ──────────────────────────────────────
def _web_search(query: str, num_results: int = 5) -> str:
    """Perform a Google search and return formatted results."""
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


# ── Helper: Self-check — ask the model if its answer needs updating ──
_SELF_CHECK_PROMPT = """You just answered a user's question. Review your answer and decide:
- Does your answer contain potentially outdated information?
- Could the answer be wrong because you lack recent data?
- Is there a factual claim that should be verified?

If YES to any of these, respond with EXACTLY: SEARCH: <search query to verify>
If NO (the answer is fine as-is), respond with EXACTLY: OK

Only respond with one line — either "SEARCH: ..." or "OK". Nothing else."""


def _self_check_answer(query: str, answer: str) -> str:
    """Ask the model to self-check if its answer needs web verification."""
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
        return "The AI service (Groq) is not configured correctly on the server. Please ensure the GroqAPIKey environment variable is set."

    try:
        if history is not None:
            # We don't want to mutate the original list prematurely,
            # so we'll make a shallow copy for the groq API call context
            messages = list(history)
            # Ensure proper format for messages (remove 'time' key if present)
            formatted_messages = []
            for m in messages:
                formatted_messages.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", "")
                })
            messages = formatted_messages
        else:
            # Load chat history
            try:
                with open(_CHATLOG_PATH, "r") as f:
                    messages = load(f)
            except (FileNotFoundError, Exception):
                messages = []

        # Keep only recent messages to avoid context overflow (last 40 exchanges)
        if len(messages) > 40:
            messages = messages[-40:]

        messages.append({"role": "user", "content": Query})

        # ── Step 1: Check if web search is needed upfront ────
        web_context = ""
        if _needs_web_search(Query):
            print(f"🔍 Auto-searching web for: {Query}")
            web_context = _web_search(Query)

        # ── Step 2: Generate initial answer ──────────────────
        system_messages = [
            {"role": "system", "content": System},
            {"role": "system", "content": _get_realtime_info()},
        ]

        if web_context:
            system_messages.append({
                "role": "system",
                "content": f"Here is the latest real-time information from the web. Use this data to give an accurate, up-to-date answer:\n\n{web_context}"
            })

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=system_messages + messages,
            max_tokens=2048,
            temperature=0.7,
            top_p=1,
            stream=True,
            stop=None
        )

        Answer = ""
        for chunk in completion:
            if chunk.choices[0].delta.content:
                Answer += chunk.choices[0].delta.content

        Answer = Answer.replace("</s>", "")

        # ── Step 3: Self-check — if no web search was done, verify the answer ──
        if not web_context:
            search_query = _self_check_answer(Query, Answer)
            if search_query:
                print(f"🔄 Self-check triggered web search: {search_query}")
                web_context = _web_search(search_query)

                if web_context:
                    # Re-generate with web data
                    system_messages.append({
                        "role": "system",
                        "content": f"IMPORTANT UPDATE: Your previous answer may be outdated. Here is the latest real-time data from the web. Please revise your answer using this information:\n\n{web_context}"
                    })

                    completion2 = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=system_messages + messages,
                        max_tokens=2048,
                        temperature=0.7,
                        top_p=1,
                        stream=True,
                        stop=None
                    )

                    Answer = ""
                    for chunk in completion2:
                        if chunk.choices[0].delta.content:
                            Answer += chunk.choices[0].delta.content

                    Answer = Answer.replace("</s>", "")

        # ── Step 4: Save and return ──────────────────────────
        messages.append({"role": "assistant", "content": Answer})

        if history is None:
            with open(_CHATLOG_PATH, "w") as f:
                dump(messages, f, indent=4)

        return AnswerModifier(Answer=Answer)

    except Exception as e:
        print(f"ChatBot Error: {e}")
        if history is None:
            try:
                with open(_CHATLOG_PATH, "w") as f:
                    dump([], f, indent=4)
            except:
                pass
        return f"An error occurred: {str(e)}. Please try again."


if __name__ == "__main__":
    while True:
        user_input = input("Enter Your Question: ")
        print(ChatBot(user_input))
