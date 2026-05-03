export const API_URL = import.meta.env.VITE_API_URL || 'https://calyx-ai-backend-wl72.onrender.com/api'

function getHeaders() {
    const token = localStorage.getItem('calyx_token')
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}

// ─── Chat ────────────────────────────────────────────
export async function sendMessage(message, conversationId = null) {
    const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, conversationId }),
    })
    if (!res.ok) throw new Error('Chat request failed')
    return res.json()
}

// ─── Conversations ───────────────────────────────────
export async function getConversations() {
    const res = await fetch(`${API_URL}/conversations`, { headers: getHeaders() })
    return res.json()
}

export async function getConversation(id) {
    const res = await fetch(`${API_URL}/conversations/${id}`, { headers: getHeaders() })
    return res.json()
}

export async function createConversation() {
    const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: getHeaders(),
    })
    return res.json()
}

export async function deleteConversation(id) {
    const res = await fetch(`${API_URL}/conversations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    })
    return res.json()
}

// ─── Health Check ────────────────────────────────────
export async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_URL}/health`, { method: 'GET' });
        if (res.ok) {
            const data = await res.json();
            return { ok: true, data };
        }
        return { ok: false, error: `Server responded with ${res.status}` };
    } catch (err) {
        return { ok: false, error: 'Cannot connect to backend. Is it running on port 5000?' };
    }
}

// ─── Image Generation ────────────────────────────────
export async function generateImage(prompt, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const res = await fetch(`${API_URL}/image/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ prompt, ...options }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return { error: `Server error (${res.status}). Please try again.` };
        }
        const data = await res.json();
        if (!res.ok) {
            return { error: data.error || data.message || `Error ${res.status}. Please try again.` };
        }
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            return { error: 'Image generation timed out after 60 seconds. Please try again.' };
        }
        return { error: 'Connection failed: Could not reach backend. Ensure it is running on port 5000.' };
    }
}

// ─── Voice / Speech ──────────────────────────────────
export async function transcribeAudio(audioBlob, language = '') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const formData = new FormData()
    let ext = 'webm';
    if (audioBlob.type.includes('mp4')) ext = 'm4a';
    else if (audioBlob.type.includes('3gpp')) ext = '3gp';
    else if (audioBlob.type.includes('wav')) ext = 'wav';
    
    formData.append('audio', audioBlob, `audio.${ext}`)
    if (language) {
        formData.append('language', language)
    }
    const token = localStorage.getItem('calyx_token')
    
    try {
        const res = await fetch(`${API_URL}/voice/transcribe`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
            signal: controller.signal
        })
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${res.status}`);
        }
        return res.json()
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Transcription timed out after 30 seconds. Please try a shorter recording.');
        }
        throw err;
    }
}

export async function textToSpeech(text) {
    const res = await fetch(`${API_URL}/voice/tts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
    })
    return res.blob()
}

// ─── Pricing ─────────────────────────────────────────
export async function getPlans() {
    const res = await fetch(`${API_URL}/plans`, { headers: getHeaders() })
    return res.json()
}

// ─── Auth ────────────────────────────────────────────
export async function signIn(credentials) {
    const res = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })
    return res.json()
}

export async function signUp(data) {
    const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return res.json()
}

// ─── OAuth URLs ──────────────────────────────────────
export function getGoogleAuthUrl(frontendOrigin) {
    const baseUrl = `${API_URL}/auth/google`
    return frontendOrigin ? `${baseUrl}?frontend_origin=${encodeURIComponent(frontendOrigin)}` : baseUrl
}

export function getGitHubAuthUrl(frontendOrigin) {
    const baseUrl = `${API_URL}/auth/github`
    return frontendOrigin ? `${baseUrl}?frontend_origin=${encodeURIComponent(frontendOrigin)}` : baseUrl
}

// ─── File Upload ─────────────────────────────────────
export async function uploadFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('calyx_token')
    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
}
