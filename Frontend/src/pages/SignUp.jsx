import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { getGoogleAuthUrl, getGitHubAuthUrl } from '../services/api'

export default function SignUp() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [error, setError] = useState('')
    const { signUp, loading, user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) {
            navigate('/chat', { replace: true })
        }
    }, [user, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!agreed) {
            setError('Please agree to the Terms of Service')
            return
        }
        setError('')
        const result = await signUp(name, email, password)
        if (result.success) {
            navigate('/chat')
        } else {
            setError(result.error)
        }
    }

    const handleGoogleLogin = () => {
        const origin = window.location.origin
        window.location.href = getGoogleAuthUrl(origin)
    }

    const handleGitHubLogin = () => {
        const origin = window.location.origin
        window.location.href = getGitHubAuthUrl(origin)
    }

    return (
        <main className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden bg-background">
            {/* Ambient Background Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                        <img 
                            src="/logo.png" 
                            alt="CALYX" 
                            className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="font-general font-bold tracking-tighter text-3xl text-foreground">CALYX</span>
                    </Link>
                    <h1 className="text-3xl font-general font-bold mb-2 text-foreground">Create account</h1>
                    <p className="text-sm text-hero-sub font-geist">Join the future of machine collaboration</p>
                </div>

                {/* Form Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="liquid-glass rounded-[32px] p-10 shadow-2xl"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-6 flex items-center gap-2 font-geist">
                            <span className="material-icons text-sm">error_outline</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-general font-bold text-hero-sub uppercase tracking-widest mb-2 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all placeholder-white/20 font-geist"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-general font-bold text-hero-sub uppercase tracking-widest mb-2 ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all placeholder-white/20 font-geist"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-general font-bold text-hero-sub uppercase tracking-widest mb-2 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:outline-none transition-all placeholder-white/20 font-geist"
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-1 rounded-md border-white/10 bg-white/5 text-primary focus:ring-primary/20 transition-all"
                            />
                            <span className="text-[11px] text-hero-sub leading-relaxed font-geist group-hover:text-foreground transition-colors">
                                I agree to the <a href="#" className="text-primary font-bold hover:text-blue-400">Terms of Service</a> and <a href="#" className="text-primary font-bold hover:text-blue-400">Privacy Policy</a>
                            </span>
                        </label>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white font-general font-bold py-4 rounded-2xl hover:bg-blue-600 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : 'Create Account'}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">Social Access</span>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Social Auth */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGoogleLogin}
                            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-3 text-xs font-general font-bold text-foreground hover:bg-white/10 transition-colors uppercase tracking-wider"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGitHubLogin}
                            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-3 text-xs font-general font-bold text-foreground hover:bg-white/10 transition-colors uppercase tracking-wider"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </motion.button>
                    </div>
                </motion.div>

                <p className="text-center text-sm text-hero-sub mt-8 font-geist">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-primary font-bold hover:text-blue-400 transition-colors">Sign in</Link>
                </p>
            </div>
        </main>
    )
}
