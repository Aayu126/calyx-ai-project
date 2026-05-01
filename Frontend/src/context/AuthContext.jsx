import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('calyx_token'))
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (token) {
            localStorage.setItem('calyx_token', token)
            // Decode JWT payload to get user info
            try {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setUser({ id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture })

            } catch {
                // Invalid token
            }
        } else {
            localStorage.removeItem('calyx_token')
            setUser(null)
        }
    }, [token])

    const signIn = async (email, password) => {
        setLoading(true)
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
            const res = await fetch(`${API_URL}/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()
            if (res.ok) {
                setUser(data.user)
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
            const res = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })
            const data = await res.json()
            if (res.ok) {
                setUser(data.user)
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
        const tkn = searchParams.get('token')
        const name = searchParams.get('name')
        const email = searchParams.get('email')
        const picture = searchParams.get('picture')
        if (tkn) {
            setToken(tkn)
            if (name && email) {
                setUser({ 
                    name: decodeURIComponent(name), 
                    email: decodeURIComponent(email), 
                    picture: picture ? decodeURIComponent(picture) : null 
                })
            }
            return true
        }
        return false
    }


    const signInWithGoogleFrontend = async (userInfo) => {
        setLoading(true)
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
            const res = await fetch(`${API_URL}/auth/google/frontend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userInfo),
            })
            const data = await res.json()
            if (res.ok) {
                setUser(data.user)
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
