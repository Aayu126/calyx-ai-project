import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendMessage, getConversations, getConversation, createConversation, deleteConversation, uploadFile } from '../services/api'
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
    const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
    const [files, setFiles] = useState([])
    const [copiedMessageId, setCopiedMessageId] = useState(null)

    // Conversation state
    const [conversations, setConversations] = useState([])
    const [activeConvId, setActiveConvId] = useState(null)

    const chatEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768 && sidebarOpen) {
                setSidebarOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [sidebarOpen])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    // Auto-expand textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`
        }
    }, [input])

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
        if (!input.trim() && files.length === 0) return
        
        const currentFiles = [...files]
        const currentInput = input
        
        // Optimistic UI update
        const tempContent = currentFiles.length > 0 
            ? `${currentFiles.map(f => `[File: ${f.name}]`).join(' ')}\n${currentInput}`
            : currentInput
        
        const userMsg = { role: 'user', content: tempContent, time: 'Just now' }
        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setFiles([])
        setIsTyping(true)

        try {
            let finalContent = currentInput
            if (currentFiles.length > 0) {
                // Upload files first
                const uploadPromises = currentFiles.map(f => uploadFile(f))
                const uploadResults = await Promise.all(uploadPromises)
                const fileLinks = uploadResults.map(r => `[${r.name}](${r.url})`).join(' ')
                finalContent = `${fileLinks}\n${currentInput}`
            }

            const data = await sendMessage(finalContent, activeConvId)
            if (data.conversationId && !activeConvId) {
                setActiveConvId(data.conversationId)
            }
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.reply || data.message || 'No response received.', time: 'Just now' },
            ])
            // Refresh conversation list
            if (user) loadConversations()
        } catch (error) {
            console.error('Send error:', error)
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: "I'm having trouble uploading files or connecting to the server. Please check your connection.", time: 'Just now' },
            ])
        } finally {
            setIsTyping(false)
        }
    }

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files)
        setFiles(prev => [...prev, ...selectedFiles])
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
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
                            return <strong key={j} className="font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">{bp.slice(2, -2)}</strong>
                        }
                        return <span key={j} className="whitespace-pre-wrap">{bp}</span>
                    })}
                </span>
            )
        })
    }

    return (
        <div className="h-[100dvh] flex bg-background font-geist overflow-hidden relative">
            {/* Ambient background for depth */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Left Sidebar */}
            <aside 
                className={`fixed md:relative top-0 left-0 h-full z-40 transition-all duration-500 ease-in-out flex flex-col border-r border-white/5 bg-[#080808] md:bg-black/20 backdrop-blur-2xl ${
                    sidebarOpen ? 'w-64 md:w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
                } overflow-hidden`}
            >
                <div className="p-4 md:p-6 flex flex-col gap-4 md:gap-6">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
                            <img 
                                src="/logo.png" 
                                alt="CALYX" 
                                className="w-6 h-6 md:w-8 md:h-8 object-contain"
                            />
                            <span className="font-general font-bold tracking-tighter text-base md:text-xl text-foreground">CALYX</span>
                        </Link>
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 shrink-0"
                        >
                            <span className="material-icons text-hero-sub text-lg">close</span>
                        </button>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            handleNewChat()
                            if (window.innerWidth < 768) setSidebarOpen(false)
                        }}
                        className="w-full bg-primary text-white font-general font-bold text-[9px] md:text-xs uppercase tracking-[0.15em] py-3 md:py-3.5 rounded-xl md:rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-icons text-sm md:text-base">add</span>
                        New Interaction
                    </motion.button>
                </div>

                <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-4">
                    <AnimatePresence>
                    {conversations.length > 0 ? (
                        <div className="space-y-4 md:space-y-6">
                            <div>
                                <p className="text-[8px] md:text-[10px] font-general font-bold uppercase tracking-[0.2em] text-hero-sub px-3 mb-3 md:mb-4">History</p>
                                <div className="space-y-1">
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => {
                                                handleLoadConversation(conv.id)
                                                if (window.innerWidth < 768) setSidebarOpen(false)
                                            }}
                                            className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all group flex items-center gap-2 md:gap-3 ${activeConvId === conv.id 
                                                ? 'bg-white/10 text-foreground ring-1 ring-white/10' 
                                                : 'text-hero-sub hover:bg-white/5 hover:text-foreground'
                                            }`}
                                        >
                                            <span className="material-icons text-base md:text-lg opacity-40">chat_bubble_outline</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-medium truncate">{conv.title}</p>
                                                <p className="text-[8px] md:text-[10px] opacity-40 uppercase tracking-wider">{formatTime(conv.updatedAt)}</p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 md:p-1.5 hover:bg-red-500/20 rounded-lg transition-all text-red-400"
                                            >
                                                <span className="material-icons text-xs md:text-sm">delete</span>
                                            </button>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 md:py-12 px-4 md:px-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 border border-white/10">
                                <span className="material-icons text-hero-sub text-xl">auto_awesome</span>
                            </div>
                            <p className="text-[9px] md:text-xs text-hero-sub leading-relaxed uppercase tracking-widest font-general font-bold">No history</p>
                        </div>
                    )}
                    </AnimatePresence>
                </div>

                {/* Sidebar bottom nav */}
                <div className="p-3 md:p-4 space-y-0.5 md:space-y-1 mt-auto">
                    {[
                        { icon: 'chat', label: 'Assistant', to: '/chat' },
                        { icon: 'visibility', label: 'Vision AI', to: '/image' },
                        { icon: 'mic', label: 'Voice Lab', to: '/voice' },
                    ].map((item) => (
                        <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => {
                                if (window.innerWidth < 768) setSidebarOpen(false)
                            }}
                            className={`flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium transition-all ${
                                window.location.pathname === item.to 
                                ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                : 'text-hero-sub hover:bg-white/5 hover:text-foreground'
                            }`}
                        >
                            <span className="material-icons text-lg md:text-xl">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10 h-full overflow-hidden">
                {/* Top Bar */}
                <header className="h-14 md:h-20 flex items-center justify-between px-3 md:px-8 bg-background/80 backdrop-blur-xl border-b border-white/5 shrink-0 z-20">
                    <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)} 
                            className="w-8 h-8 md:w-11 md:h-11 shrink-0 flex items-center justify-center rounded-lg md:rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-icons text-hero-sub text-base md:text-xl">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                        </button>
                        <div className="flex flex-col min-w-0 overflow-hidden">
                            <span className="text-[6px] md:text-[10px] font-general font-bold uppercase tracking-[0.2em] text-primary mb-0.5 truncate opacity-90">Session Status</span>
                            <h2 className="text-[10px] md:text-sm font-general font-bold text-foreground truncate max-w-[100px] xs:max-w-[150px] md:max-w-none">
                                {activeConvId ? conversations.find(c => c.id === activeConvId)?.title || 'Standard Interface' : 'Initialize CALYX'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className="hidden lg:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-general font-bold text-foreground uppercase tracking-widest">CALYX 4.0 Pro</span>
                        </div>
                        {user ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-2 md:gap-3 bg-white/5 px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                                >
                                    {user.picture ? (
                                        <img src={user.picture} alt={user.name} className="w-4 h-4 md:w-6 md:h-6 rounded-full ring-2 ring-primary/20" />
                                    ) : (
                                        <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="material-icons text-[10px] md:text-[14px] text-primary">person</span>
                                        </div>
                                    )}
                                    <span className="text-[9px] md:text-xs font-general font-bold text-foreground hidden xs:block">{user.name.split(' ')[0]}</span>
                                    <span className="material-icons text-sm text-hero-sub">expand_more</span>
                                </button>
                                
                                <AnimatePresence>
                                    {profileOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-[-1]" 
                                                onClick={() => setProfileOpen(false)}
                                            />
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 mt-3 w-48 md:w-64 liquid-glass rounded-2xl py-2 md:py-3 z-50 border border-white/10 shadow-2xl overflow-hidden"
                                            >
                                                <div className="px-5 py-3 border-b border-white/5 mb-2">
                                                    <p className="text-[11px] md:text-sm font-bold text-foreground truncate">{user.name}</p>
                                                    <p className="text-[9px] md:text-[10px] text-hero-sub truncate opacity-70">{user.email}</p>
                                                </div>
                                                <div className="px-2 space-y-1">
                                                    <button
                                                        onClick={() => {
                                                            logout()
                                                            setProfileOpen(false)
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3 group"
                                                    >
                                                        <span className="material-icons text-base md:text-lg group-hover:rotate-12 transition-transform">logout</span>
                                                        SIGN OUT
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link to="/signin" className="bg-primary text-white text-[8px] md:text-[10px] font-general font-bold px-3 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest">
                                Sign In
                            </Link>
                        )}
                    </div>
                </header>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-6 py-4 md:py-10 min-h-0">
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-10">
                        {/* New Chat Empty State */}
                        {messages.length <= 1 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="flex flex-col items-center py-8 md:py-20 text-center"
                            >
                                <div className="relative w-24 h-24 md:w-40 md:h-40 mb-6 md:mb-8">
                                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-[24px] md:rounded-[40px] liquid-glass flex items-center justify-center border border-white/10"
                                    >
                                        <div className="grid grid-cols-3 gap-1.5 md:gap-3 p-3 md:p-4">
                                            {[...Array(9)].map((_, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    animate={{ 
                                                        scale: [1, 1.4, 1], 
                                                        opacity: [0.3, 1, 0.3],
                                                        borderRadius: ["20%", "50%", "20%"]
                                                    }}
                                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-1.5 md:w-3 h-1.5 md:h-3 bg-primary" 
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                                <h3 className="text-lg md:text-2xl font-general font-bold text-foreground mb-3">Universal Intelligence</h3>
                                <p className="text-[8px] md:text-[10px] font-geist text-hero-sub max-w-[240px] md:max-w-sm mx-auto leading-relaxed uppercase tracking-[0.2em]">
                                    Autonomous engine ready for synchronization.<br className="hidden md:block"/>Deploying CALYX 4.0 core.
                                </p>
                            </motion.div>
                        )}

                        {/* Message Loop */}
                        <AnimatePresence mode="popLayout" initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div 
                                key={activeConvId ? `${activeConvId}-${i}` : i} 
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ 
                                    duration: 0.4, 
                                    ease: [0.23, 1, 0.32, 1],
                                    layout: { type: "spring", stiffness: 300, damping: 30 }
                                }}
                                className={`flex gap-3 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 pt-1">
                                    {msg.role === 'assistant' ? (
                                        <div className="relative group">
                                            <div className="absolute -inset-1 bg-primary/40 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
                                                <span className="material-icons text-white text-xs md:text-xl">auto_awesome</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center backdrop-blur-sm">
                                            <span className="material-icons text-hero-sub text-xs md:text-xl">person</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`max-w-[88%] md:max-w-[80%] lg:max-w-[75%] space-y-1.5 md:space-y-2 min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`relative group p-3.5 md:p-6 rounded-[18px] md:rounded-[32px] text-[13px] md:text-[15px] leading-relaxed font-geist transition-all duration-300 ${
                                        msg.role === 'user'
                                        ? 'bg-primary text-white shadow-2xl shadow-primary/10 rounded-tr-sm'
                                        : 'liquid-glass text-foreground border border-white/10 rounded-tl-sm shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
                                    }`}>
                                        {msg.role === 'assistant' && (
                                            <>
                                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full blur-[2px] opacity-50" />
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(msg.content);
                                                        setCopiedMessageId(activeConvId ? `${activeConvId}-${i}` : i);
                                                        setTimeout(() => setCopiedMessageId(null), 2000);
                                                    }}
                                                    className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 active:scale-90 z-10"
                                                    title="Copy response"
                                                >
                                                    <span className="material-icons text-[12px] md:text-[16px] text-hero-sub">
                                                        {copiedMessageId === (activeConvId ? `${activeConvId}-${i}` : i) ? 'check' : 'content_copy'}
                                                    </span>
                                                </button>
                                            </>
                                        )}
                                        {renderContent(msg.content)}
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-[0.15em] text-hero-sub opacity-40">
                                            {msg.role === 'assistant' ? 'CALYX Intelligence' : (user?.name?.split(' ')[0] || 'Operator')}
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <p className="text-[9px] md:text-[11px] font-medium text-hero-sub opacity-30">
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        {isTyping && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="flex gap-2 md:gap-6"
                            >
                                <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                                    <span className="material-icons text-white text-sm md:text-xl">auto_awesome</span>
                                </div>
                                <div className="liquid-glass border border-white/5 px-4 md:px-6 py-3 md:py-5 rounded-xl md:rounded-[24px] rounded-tl-sm shadow-xl">
                                    <div className="flex gap-1 md:gap-2">
                                        {[0, 1, 2].map((dot) => (
                                            <motion.div 
                                                key={dot}
                                                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                                transition={{ duration: 1.5, repeat: Infinity, delay: dot * 0.2 }}
                                                className="w-1 md:w-2 h-1 md:h-2 rounded-full bg-primary" 
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
                <div className="p-3 md:p-6 bg-gradient-to-t from-background via-background to-transparent shrink-0">
                    <div className="max-w-4xl mx-auto relative group">
                        {/* File Preview */}
                        <AnimatePresence>
                            {files.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex flex-wrap gap-2 mb-2 p-2 bg-white/5 rounded-2xl border border-white/10"
                                >
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-primary/20 text-primary text-[10px] font-bold px-3 py-1.5 rounded-lg border border-primary/30">
                                            <span className="material-icons text-sm">description</span>
                                            <span className="truncate max-w-[100px]">{file.name}</span>
                                            <button onClick={() => removeFile(idx)} className="hover:text-red-400 transition-colors">
                                                <span className="material-icons text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[20px] md:rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative liquid-glass rounded-[22px] md:rounded-[32px] border border-white/10 p-1 md:p-2 flex items-end gap-1 md:gap-2 shadow-2xl">
                            <label className="flex w-10 md:w-12 h-10 md:h-12 items-center justify-center rounded-xl md:rounded-2xl hover:bg-white/5 transition-colors text-hero-sub hover:text-foreground shrink-0 cursor-pointer">
                                <span className="material-icons text-xl">add_circle_outline</span>
                                <input type="file" className="hidden" multiple onChange={handleFileChange} />
                            </label>
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
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] md:text-sm text-white placeholder-hero-sub/40 py-3 md:py-3 px-3 md:px-3 resize-none font-geist max-h-40 min-w-0"
                                placeholder="Command CALYX..."
                            />
                            <div className="flex items-center gap-1 md:gap-2 pr-1 md:pr-2 pb-1 md:pb-2 shrink-0">
                                <Link to="/voice" className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-2xl hover:bg-white/5 transition-colors text-hero-sub hover:text-foreground">
                                    <span className="material-icons text-xl md:text-xl">mic_none</span>
                                </Link>
                                <motion.button
                                    whileHover={(input.trim() || files.length > 0) ? { scale: 1.05 } : {}}
                                    whileTap={(input.trim() || files.length > 0) ? { scale: 0.95 } : {}}
                                    onClick={handleSend}
                                    disabled={!input.trim() && files.length === 0}
                                    className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-2xl transition-all ${
                                        (input.trim() || files.length > 0)
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="material-icons text-xl md:text-xl">north</span>
                                </motion.button>
                            </div>
                        </div>
                        <p className="text-center text-[6px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-hero-sub/30 mt-2 md:mt-4">
                            CALYX AI Engine v4.0.2 • Secure Session
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
