import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('calyx_token'))
    const [loading, setLoading] = useState(true) // Start with loading true to check token

    const API_URL = import.meta.env.VITE_API_URL || 'https://calyx-ai-backend-wl72.onrender.com/api'

    const decodeAndSetUser = (tkn) => {
        try {
            const base64Url = tkn.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            }).join(''))
            
            const payload = JSON.parse(jsonPayload)
            setUser({ 
                id: payload.sub, 
                name: payload.name, 
                email: payload.email, 
                picture: payload.picture 
            })
            return true
        } catch (e) {
            console.error('Token decode failed:', e)
            return false
        }
    }

    useEffect(() => {
        if (token) {
            localStorage.setItem('calyx_token', token)
            decodeAndSetUser(token)
        } else {
            localStorage.removeItem('calyx_token')
            setUser(null)
        }
        setLoading(false)
    }, [token])

    const signIn = async (email, password) => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()
            if (res.ok) {
                localStorage.setItem('calyx_token', data.token)
                decodeAndSetUser(data.token)
                setToken(data.token)
                return { success: true }
            }
            return { success: false, error: data.message || 'Sign in failed' }
        } catch {
            return { success: false, error: 'Network error' }
        } finally {
            setLoading(false)
        }
    }

    const signUp = async (name, email, password) => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })
            const data = await res.json()
            if (res.ok) {
                localStorage.setItem('calyx_token', data.token)
                decodeAndSetUser(data.token)
                setToken(data.token)
                return { success: true }
            }
            return { success: false, error: data.message || 'Sign up failed' }
        } catch {
            return { success: false, error: 'Network error' }
        } finally {
            setLoading(false)
        }
    }

    /** Handle OAuth redirect callback — reads token from URL params */
    const handleOAuthCallback = (searchParams) => {
        setLoading(true) // Ensure loading is true while we process the callback
        const tkn = searchParams.get('token')
        const name = searchParams.get('name')
        const email = searchParams.get('email')
        const picture = searchParams.get('picture')
        
        if (tkn) {
            localStorage.setItem('calyx_token', tkn)
            
            // Try to set user from token first (more reliable id/sub)
            const decoded = decodeAndSetUser(tkn)
            
            // Fallback to params if decoding fails but we have params
            if (!decoded && name && email) {
                setUser({ 
                    name: decodeURIComponent(name), 
                    email: decodeURIComponent(email), 
                    picture: picture ? decodeURIComponent(picture) : null 
                })
            }
            
            setToken(tkn)
            setLoading(false)
            return true
        }
        setLoading(false) // Reset loading if no token found
        return false
    }

    const signInWithGoogleFrontend = async (userInfo) => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/google/frontend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userInfo),
            })
            const data = await res.json()
            if (res.ok) {
                setToken(data.token)
                return { success: true }
            }
            return { success: false, error: data.message || 'Google sign in failed' }
        } catch {
            return { success: false, error: 'Network error' }
        } finally {
            setLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('calyx_token')
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, signIn, signUp, logout, handleOAuthCallback, signInWithGoogleFrontend }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within an AuthProvider')
    return context
}
