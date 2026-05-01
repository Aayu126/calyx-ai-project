import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { User, LogOut } from 'lucide-react'

export default function Navbar() {
    const { user, logout } = useAuth()
    
    const navItems = [
        { label: 'Chat', path: '/chat' },
        { label: 'Vision', path: '/image' },
        { label: 'Voice', path: '/voice' },
        { label: 'Pricing', path: '/pricing' },
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6">
            <motion.nav 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="liquid-glass flex items-center justify-between px-8 py-3 rounded-full w-full max-w-6xl shadow-2xl"
            >
                {/* Left: Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
                        <img 
                            src="/logo.png" 
                            alt="Calyx" 
                            className="h-8 relative z-10 group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="hidden font-general font-bold text-xl tracking-tighter text-foreground relative z-10">CALYX</span>
                    </div>
                    <span className="font-general font-bold text-xl tracking-tighter text-foreground group-hover:text-primary transition-colors">CALYX</span>
                </Link>

                {/* Center: Nav Items */}
                <div className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => (
                        <Link 
                            key={item.label}
                            to={item.path}
                            className="text-foreground/70 hover:text-foreground transition-all font-medium text-xs uppercase tracking-widest"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Right: Action */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link to="/chat" className="flex items-center gap-2 text-foreground/70 hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors">
                                <User size={14} />
                                <span>{user.name || 'Profile'}</span>
                            </Link>
                            <button 
                                onClick={logout}
                                className="flex items-center gap-2 text-foreground/70 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                                <LogOut size={14} />
                                <span>Logout</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link to="/signin" className="text-foreground/70 hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors">
                                Sign In
                            </Link>
                            <Link to="/signup" className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </motion.nav>
        </header>
    )
}


