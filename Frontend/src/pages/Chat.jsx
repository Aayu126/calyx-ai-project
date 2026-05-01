import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendMessage, getConversations, getConversation, createConversation, deleteConversation } from '../services/api'
import { useAuth } from '../context/AuthContext'

const INITIAL_MESSAGES = [
    {
        role: 'assistant',
        content: "Hello! I'm **CALYX**, your AI assistant. I can help you with code, images, voice, and more. What would you like to work on?",
        time: 'Just now',
    },
]

export default function Chat() {
    const { user, logout } = useAuth()
    const [profileOpen, setProfileOpen] = useState(false)

    const [messages, setMessages] = useState(INITIAL_MESSAGES)
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // Conversation state
    const [conversations, setConversations] = useState([])
    const [activeConvId, setActiveConvId] = useState(null)

    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    // Load conversations on mount
    useEffect(() => {
        if (user) {
            loadConversations()
        }
    }, [user])

    const loadConversations = async () => {
        try {
            const data = await getConversations()
            setConversations(data.conversations || [])
        } catch {
            // Not logged in or network error
        }
    }

    const handleNewChat = async () => {
        setMessages(INITIAL_MESSAGES)
        setActiveConvId(null)
        if (user) {
            try {
                const conv = await createConversation()
                setActiveConvId(conv.id)
                loadConversations()
            } catch {
                // Ignore
            }
        }
    }

    const handleLoadConversation = async (convId) => {
        try {
            const data = await getConversation(convId)
            setActiveConvId(convId)
            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    time: formatTime(m.time),
                })))
            } else {
                setMessages(INITIAL_MESSAGES)
            }
        } catch {
            // Ignore
        }
    }

    const handleDeleteConversation = async (e, convId) => {
        e.stopPropagation()
        try {
            await deleteConversation(convId)
            if (activeConvId === convId) {
                setMessages(INITIAL_MESSAGES)
                setActiveConvId(null)
            }
            loadConversations()
        } catch {
            // Ignore
        }
    }

    const formatTime = (isoString) => {
        if (!isoString || isoString === 'Just now') return 'Just now'
        try {
            const d = new Date(isoString)
            const now = new Date()
            const diff = now - d
            if (diff < 60000) return 'Just now'
            if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
            return d.toLocaleDateString()
        } catch {
            return 'Just now'
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return
        const userMsg = { role: 'user', content: input, time: 'Just now' }
        setMessages((prev) => [...prev, userMsg])
        const currentInput = input
        setInput('')
        setIsTyping(true)

        try {
            const data = await sendMessage(currentInput, activeConvId)
            if (data.conversationId && !activeConvId) {
                setActiveConvId(data.conversationId)
            }
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.reply || data.message || 'No response received.', time: 'Just now' },
            ])
            // Refresh conversation list
            if (user) loadConversations()
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: "I'm having trouble connecting to the server. Please check that the backend is running.", time: 'Just now' },
            ])
        } finally {
            setIsTyping(false)
        }
    }

    const renderContent = (content) => {
        // Handle images: ![alt](url)
        const parts = content.split(/(!\[.*?\]\(.*?\))/g)
        return parts.map((part, i) => {
            if (part.startsWith('![') && part.includes('](')) {
                const match = part.match(/!\[(.*?)\]\((.*?)\)/)
                if (match) {
                    const alt = match[1]
                    const url = match[2]
                    return (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                        >
                            <img src={url} alt={alt} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" onClick={() => window.open(url, '_blank')} />
                            {alt && <p className="px-3 py-2 text-[10px] text-slate-400 bg-slate-50 italic border-t border-slate-100">{alt}</p>}
                        </motion.div>
                    )
                }
            }
            
            // Handle code blocks
            if (part.startsWith('```')) {
                const lines = part.replace(/```\w*\n?/g, '').replace(/```$/g, '').trim()
                return (
                    <div key={i} className="my-3 bg-slate-900 rounded-lg p-4 font-mono text-sm text-white overflow-x-auto relative group">
                        <button
                            onClick={() => navigator.clipboard.writeText(lines)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 px-2 py-1 rounded text-xs text-slate-300 hover:bg-slate-600"
                        >
                            Copy
                        </button>
                        <pre className="whitespace-pre-wrap">{lines}</pre>
                    </div>
                )
            }
            
            // Handle bolding
            const boldParts = part.split(/(\*\*.*?\*\*)/g)
            return (
                <span key={i}>
                    {boldParts.map((bp, j) => {
                        if (bp.startsWith('**') && bp.endsWith('**')) {
                            return <strong key={j} className="font-semibold text-primary">{bp.slice(2, -2)}</strong>
                        }
                        return <span key={j} className="whitespace-pre-wrap">{bp}</span>
                    })}
                </span>
            )
        })
    }

    return (
        <div className="h-screen flex bg-background font-geist">
            {/* Ambient background for depth */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Left Sidebar */}
            <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-500 ease-in-out overflow-hidden relative z-20 flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-xl`}>
                <div className="p-6">
                    <Link to="/" className="flex items-center gap-3 mb-8 group">
                        <img 
                            src="/logo.png" 
                            alt="CALYX" 
                            className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                        <span className="font-general font-bold tracking-tighter text-xl text-foreground">CALYX</span>
                    </Link>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNewChat}
                        className="w-full bg-primary text-white font-general font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-icons text-base">add</span>
                        New Chat
                    </motion.button>
                </div>

                <div className="flex-1 overflow-y-auto chat-scroll px-4">
                    <AnimatePresence>
                    {conversations.length > 0 ? (
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-general font-bold uppercase tracking-[0.2em] text-hero-sub px-3 mb-4">History</p>
                                <div className="space-y-1">
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => handleLoadConversation(conv.id)}
                                            className={`w-full text-left px-4 py-3 rounded-2xl transition-all group flex items-center gap-3 ${activeConvId === conv.id 
                                                ? 'bg-white/10 text-foreground ring-1 ring-white/10' 
                                                : 'text-hero-sub hover:bg-white/5 hover:text-foreground'
                                            }`}
                                        >
                                            <span className="material-icons text-lg opacity-40">chat_bubble_outline</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{conv.title}</p>
                                                <p className="text-[10px] opacity-40 uppercase tracking-wider">{formatTime(conv.updatedAt)}</p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all text-red-400"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                <span className="material-icons text-hero-sub">auto_awesome</span>
                            </div>
                            <p className="text-xs text-hero-sub leading-relaxed uppercase tracking-widest font-general font-bold">No history found</p>
                        </div>
                    )}
                    </AnimatePresence>
                </div>

                {/* Sidebar bottom nav */}
                <div className="p-4 space-y-1 mt-auto">
                    {[
                        { icon: 'chat', label: 'Assistant', to: '/chat' },
                        { icon: 'visibility', label: 'Vision AI', to: '/image' },
                        { icon: 'mic', label: 'Voice Lab', to: '/voice' },
                        { icon: 'auto_graph', label: 'Upgrade', to: '/pricing' },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            to={item.to}
                            className={`flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                                window.location.pathname === item.to 
                                ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                : 'text-hero-sub hover:bg-white/5 hover:text-foreground'
                            }`}
                        >
                            <span className="material-icons text-xl">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">
                {/* Top Bar */}
                <header className="h-20 flex items-center justify-between px-8 bg-background/50 backdrop-blur-md border-b border-white/5">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-icons text-hero-sub">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-general font-bold uppercase tracking-[0.2em] text-primary mb-0.5">Active Session</span>
                            <h2 className="text-sm font-general font-bold text-foreground">
                                {activeConvId ? conversations.find(c => c.id === activeConvId)?.title || 'Standard Chat' : 'New Interaction'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-general font-bold text-foreground uppercase tracking-widest">CALYX 4.0 Pro</span>
                        </div>
                        {user ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                >
                                    {user.picture ? (
                                        <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full ring-2 ring-primary/20" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="material-icons text-[14px] text-primary">person</span>
                                        </div>
                                    )}
                                    <span className="text-xs font-general font-bold text-foreground">{user.name.split(' ')[0]}</span>
                                    <span className="material-icons text-sm text-hero-sub">expand_more</span>
                                </button>
                                
                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute right-0 mt-3 w-56 liquid-glass rounded-2xl py-3 z-50 border border-white/10 shadow-2xl"
                                        >
                                            <div className="px-5 py-2 border-b border-white/5 mb-2">
                                                <p className="text-[10px] text-hero-sub font-bold uppercase tracking-widest truncate">{user.email}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    logout()
                                                    setProfileOpen(false)
                                                }}
                                                className="w-full text-left px-5 py-3 text-xs font-general font-bold text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-3"
                                            >
                                                <span className="material-icons text-lg">logout</span>
                                                SIGN OUT
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link to="/signin" className="bg-primary text-white text-[10px] font-general font-bold px-6 py-2.5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest">
                                Sign In
                            </Link>
                        )}
                    </div>
                </header>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto chat-scroll px-6 py-10">
                    <div className="max-w-4xl mx-auto space-y-10">
                        {/* New Chat Empty State */}
                        {messages.length <= 1 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="flex flex-col items-center py-20 text-center"
                            >
                                <div className="relative w-40 h-40 mb-8">
                                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-[40px] liquid-glass flex items-center justify-center border border-white/10"
                                    >
                                        <div className="grid grid-cols-3 gap-3 p-4">
                                            {[...Array(9)].map((_, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    animate={{ 
                                                        scale: [1, 1.4, 1], 
                                                        opacity: [0.3, 1, 0.3],
                                                        borderRadius: ["20%", "50%", "20%"]
                                                    }}
                                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-3 h-3 bg-primary" 
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                                <h3 className="text-2xl font-general font-bold text-foreground mb-4">Universal Intelligence</h3>
                                <p className="text-sm font-geist text-hero-sub max-w-sm mx-auto leading-relaxed uppercase tracking-[0.2em] text-[10px]">
                                    Autonomous engine ready for synchronization.<br/>Deploying CALYX 4.0 core.
                                </p>
                            </motion.div>
                        )}

                        {/* Message Loop */}
                        <AnimatePresence mode="popLayout">
                        {messages.map((msg, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 pt-1">
                                    {msg.role === 'assistant' ? (
                                        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                            <span className="material-icons text-white text-xl">auto_awesome</span>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <span className="material-icons text-hero-sub text-xl">person</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                                    <div className={`p-6 rounded-[32px] text-sm leading-relaxed font-geist ${
                                        msg.role === 'user'
                                        ? 'bg-primary text-white shadow-2xl shadow-primary/20 rounded-tr-sm'
                                        : 'liquid-glass text-foreground border border-white/5 rounded-tl-sm shadow-xl'
                                    }`}>
                                        {renderContent(msg.content)}
                                    </div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest text-hero-sub px-4 ${
                                        msg.role === 'user' ? 'text-right' : 'text-left'
                                    }`}>
                                        {msg.role === 'assistant' ? 'CALYX Intelligence' : (user?.name || 'Authorized User')}
                                        <span className="mx-2 opacity-20">/</span>
                                        {msg.time}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        {isTyping && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="flex gap-6"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                                    <span className="material-icons text-white text-xl">auto_awesome</span>
                                </div>
                                <div className="liquid-glass border border-white/5 px-6 py-5 rounded-[24px] rounded-tl-sm shadow-xl">
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map((dot) => (
                                            <motion.div 
                                                key={dot}
                                                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                                transition={{ duration: 1.5, repeat: Infinity, delay: dot * 0.2 }}
                                                className="w-2 h-2 rounded-full bg-primary" 
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-8 bg-gradient-to-t from-background via-background to-transparent">
                    <div className="max-w-4xl mx-auto relative group">
                        {/* Shadow bloom effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative liquid-glass rounded-[32px] border border-white/10 p-2 flex items-center gap-2 shadow-2xl">
                            <button className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-colors text-hero-sub hover:text-foreground" title="Attachment">
                                <span className="material-icons text-xl">add_circle_outline</span>
                            </button>
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows={1}
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-foreground placeholder-hero-sub py-3 px-2 resize-none font-geist max-h-40"
                                placeholder="Command CALYX AI..."
                            />
                            <div className="flex items-center gap-1 pr-2">
                                <Link to="/voice" className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-colors text-hero-sub hover:text-foreground">
                                    <span className="material-icons text-xl">mic_none</span>
                                </Link>
                                <motion.button
                                    whileHover={input.trim() ? { scale: 1.05 } : {}}
                                    whileTap={input.trim() ? { scale: 0.95 } : {}}
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                                        input.trim()
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="material-icons text-xl">north</span>
                                </motion.button>
                            </div>
                        </div>
                        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-hero-sub/30 mt-4">
                            Cryptographically secured communication engine v4.0.2
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
