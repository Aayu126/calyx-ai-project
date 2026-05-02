import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
    const [searchParams] = useSearchParams()
    const { handleOAuthCallback } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState('')

    useEffect(() => {
        const err = searchParams.get('error')
        if (err) {
            setError(err === 'oauth_failed'
                ? 'OAuth authentication failed. Please try again.'
                : err === 'no_code'
                    ? 'No authorization code received.'
                    : `Authentication error: ${err}`)
            return
        }

        const token = searchParams.get('token')
        if (token) {
            const success = handleOAuthCallback(searchParams)
            if (success) {
                // Give React a moment to propagate the state change
                const timeout = setTimeout(() => {
                    navigate('/chat', { replace: true })
                }, 100)
                return () => clearTimeout(timeout)
            } else {
                setError('Failed to process authentication. Please try again.')
            }
        }
    }, [searchParams, handleOAuthCallback, navigate])

    if (error) {
        return (
            <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-background">
                {/* Background Orb */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 blur-[150px] rounded-full pointer-events-none" />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center max-w-md liquid-glass p-12 rounded-[40px] border border-white/5 shadow-2xl"
                >
                    <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/30">
                        <span className="material-icons text-4xl text-red-400">error_outline</span>
                    </div>
                    <h1 className="text-2xl font-general font-bold mb-4 text-foreground">Authentication Error</h1>
                    <p className="text-sm font-geist text-hero-sub mb-10 leading-relaxed uppercase tracking-widest">{error}</p>
                    <Link
                        to="/signin"
                        className="inline-flex items-center gap-3 bg-primary text-white font-general font-bold px-8 py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        Back to Sign In
                    </Link>
                </motion.div>
            </main>
        )
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 text-center">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                    />
                </div>
                <h2 className="text-xl font-general font-bold text-foreground mb-2 uppercase tracking-[0.2em]">Synchronizing</h2>
                <p className="text-xs font-geist text-hero-sub uppercase tracking-widest">Completing secure handshake...</p>
            </div>
        </main>
    )
}
