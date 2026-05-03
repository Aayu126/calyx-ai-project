import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
// Removed Lucide imports to prevent crashes due to version mismatches
// import { User, LogOut, Menu, X, ChevronDown } from 'lucide-react'
import React, { useState } from 'react'

export default function Navbar() {
    const { user, logout } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    
    const navItems = [
        { label: 'Chat', path: '/chat' },
        { label: 'Vision', path: '/image' },
        { label: 'Voice', path: '/voice' },
        { label: 'Pricing', path: '/pricing' },
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 md:p-6">
            <motion.nav 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="liquid-glass flex items-center justify-between px-4 md:px-8 py-2 md:py-3 rounded-full w-full max-w-6xl shadow-2xl overflow-hidden"
            >
                {/* Left: Logo */}
                <Link to="/" className="flex items-center gap-1.5 md:gap-3 group shrink-0">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-colors" />
                        <img 
                            src="/logo.png" 
                            alt="Calyx" 
                            className="h-5 md:h-8 relative z-10 group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <span className="hidden font-general font-bold text-lg md:text-xl tracking-tighter text-foreground relative z-10">CALYX</span>
                    </div>
                    <span className="font-general font-bold text-base md:text-xl tracking-tighter text-foreground group-hover:text-primary transition-colors">CALYX</span>
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
                <div className="flex items-center gap-2 md:gap-4">
                    {user ? (
                        <div className="relative">
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 md:gap-2.5 bg-white/5 border border-white/10 px-2.5 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-white/10 transition-all group active:scale-95"
                            >
                                {user.picture ? (
                                    <img src={user.picture} alt="" className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-primary/20" />
                                ) : (
                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="material-icons text-[12px] text-primary">person</span>
                                    </div>
                                )}
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden xs:block">{user.name?.split(' ')[0] || 'User'}</span>
                                <span className={`material-icons text-[14px] transition-transform duration-300 text-foreground/50 ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {/* Profile Dropdown */}
                            <AnimatePresence>
                                {isProfileOpen && (
                                    <>
                                        {/* Backdrop to close on click outside */}
                                        <div 
                                            className="fixed inset-0 z-[-1]" 
                                            onClick={() => setIsProfileOpen(false)}
                                        />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-56 md:w-64 liquid-glass border border-white/10 rounded-2xl py-3 shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="px-5 py-3 border-b border-white/5 mb-2">
                                                <p className="text-[11px] md:text-sm font-bold text-foreground truncate">{user.name}</p>
                                                <p className="text-[9px] md:text-[10px] text-hero-sub truncate opacity-70">{user.email}</p>
                                            </div>
                                            <div className="px-2 space-y-1">
                                                <Link 
                                                    to="/chat" 
                                                    onClick={() => setIsProfileOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-white/5 rounded-xl transition-colors group"
                                                >
                                                    <span className="material-icons text-sm group-hover:text-primary transition-colors">dashboard</span>
                                                    Workspace
                                                </Link>
                                                <button 
                                                    onClick={() => {
                                                        logout();
                                                        setIsProfileOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 rounded-xl transition-colors group"
                                                >
                                                    <span className="material-icons text-sm">logout</span>
                                                    Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 md:gap-4">
                            <Link to="/signin" className="hidden xs:block text-foreground/70 hover:text-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors">
                                Sign In
                            </Link>
                            <Link to="/signup" className="px-4 md:px-6 py-1.5 md:py-2.5 bg-primary text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                Join
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-1 text-foreground/70 hover:text-foreground flex items-center justify-center"
                    >
                        <span className="material-icons text-xl">
                            {isMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Navigation Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-16 left-4 right-4 md:hidden liquid-glass rounded-[2rem] p-5 shadow-2xl z-40 border border-white/10"
                    >
                        <div className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <Link 
                                    key={item.label}
                                    to={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70 hover:text-primary transition-colors text-center py-1.5"
                                >
                                    {item.label}
                                </Link>
                            ))}
                            {user ? (
                                <div className="flex flex-col gap-4 pt-3 border-t border-white/5">
                                    <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3 mb-1">
                                            {user.picture ? (
                                                <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="material-icons text-[10px] text-primary">person</span>
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground truncate">{user.name}</p>
                                        </div>
                                        <p className="text-[8px] text-foreground/50 truncate pl-9">{user.email}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            logout();
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 text-[9px] font-bold uppercase tracking-[0.2em] rounded-xl border border-red-500/20 active:scale-95 transition-all"
                                    >
                                        <span className="material-icons text-sm">logout</span>
                                        Sign Out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                                    <Link 
                                        to="/signin" 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="text-center text-[9px] font-bold uppercase tracking-widest text-foreground/70 py-1"
                                    >
                                        Sign In
                                    </Link>
                                    <Link 
                                        to="/signup" 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="w-full py-2.5 bg-primary text-white text-center text-[9px] font-black uppercase tracking-[0.2em] rounded-xl"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}


