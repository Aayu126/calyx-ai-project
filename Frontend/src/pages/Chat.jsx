import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendMessage, getConversations, getConversation, createConversation, deleteConversation, uploadFile, sendSystemCommand } from '../services/api'
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
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [files, setFiles] = useState([])
    const [copiedMessageId, setCopiedMessageId] = useState(null)

    // Conversation state
    const [conversations, setConversations] = useState([])
    const [activeConvId, setActiveConvId] = useState(null)

    const chatEndRef = useRef(null)
    const inputRef = useRef(null)
    const recognitionRef = useRef(null)

    const [isListening, setIsListening] = useState(false)
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [systemControlAllowed, setSystemControlAllowed] = useState(() => {
        return localStorage.getItem('systemControlAllowed') === 'true'
    })

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

    // ─── Voice / Jarvis Logic ────────────────────────────
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser.')
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false // Auto-stop when user stops speaking
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onstart = () => setIsListening(true)
        recognitionRef.current.onend = () => setIsListening(false)
        recognitionRef.current.onspeechend = () => {
            recognitionRef.current?.stop()
            setIsListening(false)
        }
        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            setIsListening(false)
        }
        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            processVoiceCommand(transcript)
            recognitionRef.current?.stop()
        }
    }, [])

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop()
        } else {
            try {
                // Clear any potential leftover states
                setIsListening(false)
                recognitionRef.current?.start()
                
                // Watchdog: auto-stop after 10s if nothing happens
                setTimeout(() => {
                    if (recognitionRef.current && isListening) {
                        recognitionRef.current.stop()
                        setIsListening(false)
                    }
                }, 10000)
            } catch (err) {
                console.error('Failed to start recognition:', err)
            }
        }
    }

    const processVoiceCommand = async (transcript) => {
        const cmd = transcript.toLowerCase().trim()
        
        // 1. Check for Web Intents (Frontend handled)
        const webIntents = [
            { keywords: ['youtube', 'play music', 'play song'], url: 'https://www.youtube.com', searchPrefix: 'https://www.youtube.com/results?search_query=', label: 'YouTube' },
            { keywords: ['google', 'search for'], url: 'https://www.google.com', searchPrefix: 'https://www.google.com/search?q=', label: 'Google' },
            { keywords: ['whatsapp'], url: 'https://web.whatsapp.com', label: 'WhatsApp' },
            { keywords: ['gmail', 'email'], url: 'https://mail.google.com', label: 'Gmail' },
            { keywords: ['spotify'], url: 'https://open.spotify.com', label: 'Spotify' },
            { keywords: ['discord'], url: 'https://discord.com/app', label: 'Discord' },
            { keywords: ['instagram'], url: 'https://www.instagram.com', label: 'Instagram' },
            { keywords: ['twitter', ' x '], url: 'https://x.com', label: 'X' },
            { keywords: ['github'], url: 'https://github.com', label: 'GitHub' },
        ]

        for (const intent of webIntents) {
            if (intent.keywords.some(kw => cmd.includes(kw))) {
                let targetUrl = intent.url
                if (intent.searchPrefix) {
                    const query = intent.keywords.reduce((acc, kw) => acc.replace(kw, ''), cmd).trim()
                    if (query) targetUrl = `${intent.searchPrefix}${encodeURIComponent(query)}`
                }
                window.open(targetUrl, '_blank')
                addSystemMessage(`Opening ${intent.label} for you...`)
                return
            }
        }

        // 2. Check for System Commands (Backend handled)
        const systemKeywords = [
            'open notepad', 'launch notepad', 
            'open calculator', 'launch calculator',
            'open paint', 'launch paint',
            'open chrome', 'launch chrome',
            'open explorer', 'launch explorer',
            'open task manager', 'launch task manager',
            'open control panel', 'launch control panel',
            'open settings', 'launch settings',
            'open spotify', 'launch spotify',
            'open discord', 'launch discord',
            'open vscode', 'launch vscode',
            'open terminal', 'launch terminal'
        ]

        if (systemKeywords.some(sk => cmd.includes(sk)) || cmd.startsWith('open ') || cmd.includes('launch ')) {
            if (!systemControlAllowed) {
                setShowPermissionModal(true)
                return
            }
            try {
                const res = await sendSystemCommand(cmd)
                if (res.ok) {
                    addSystemMessage(res.message)
                } else {
                    addSystemMessage(`System Error: ${res.error || 'Failed to execute command. This usually requires a local bridge.'}`)
                }
            } catch (err) {
                addSystemMessage(`Local bridge not detected. Please ensure CALYX Bridge is running on your device.`)
            }
            return
        }

        // 3. Fallback: Standard Chat
        setInput(transcript)
        setTimeout(() => handleSend(transcript), 500)
    }

    const addSystemMessage = (content) => {
        const newMsg = {
            role: 'assistant',
            content: `**[SYSTEM]** ${content}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages(prev => [...prev, newMsg])
    }

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

    const handleSend = async (manualMsg = null) => {
        const messageToSend = manualMsg || input
        if (!messageToSend.trim() && files.length === 0) return
        
        const currentFiles = [...files]
        const currentInput = messageToSend
        
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
            if (user) loadConversations()
        } catch (error) {
            console.error('Send error:', error)
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: "I'm having trouble connecting to the server. Please check your connection.", time: 'Just now' },
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
                            className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg"
                        >
                            <img src={url} alt={alt} className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in" onClick={() => window.open(url, '_blank')} />
                        </motion.div>
                    )
                }
            }
            
            if (part.startsWith('```')) {
                const lines = part.replace(/```\w*\n?/g, '').replace(/```$/g, '').trim()
                return (
                    <div key={i} className="my-3 bg-black/40 rounded-xl p-4 font-mono text-sm text-white/90 overflow-x-auto relative group border border-white/5 backdrop-blur-md">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(lines)
                                setCopiedMessageId(`code-${i}`)
                                setTimeout(() => setCopiedMessageId(null), 2000)
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                        >
                            <span className="material-icons text-[14px]">
                                {copiedMessageId === `code-${i}` ? 'check' : 'content_copy'}
                            </span>
                        </button>
                        <pre className="whitespace-pre-wrap">{lines}</pre>
                    </div>
                )
            }
            
            const boldParts = part.split(/(\*\*.*?\*\*)/g)
            return (
                <span key={i}>
                    {boldParts.map((bp, j) => {
                        if (bp.startsWith('**') && bp.endsWith('**')) {
                            return <strong key={j} className="font-bold text-primary">{bp.slice(2, -2)}</strong>
                        }
                        return <span key={j} className="whitespace-pre-wrap">{bp}</span>
                    })}
                </span>
            )
        })
    }

    return (
        <div className="h-[100dvh] flex bg-background font-geist overflow-hidden relative">
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
                            <img src="/logo.png" alt="CALYX" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                            <span className="font-general font-bold tracking-tighter text-base md:text-xl text-foreground">CALYX</span>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                            <span className="material-icons text-hero-sub text-lg">close</span>
                        </button>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { handleNewChat(); if (window.innerWidth < 768) setSidebarOpen(false) }}
                        className="w-full bg-primary text-white font-general font-bold text-[9px] md:text-xs uppercase tracking-[0.15em] py-3 md:py-3.5 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
                                            onClick={() => { handleLoadConversation(conv.id); if (window.innerWidth < 768) setSidebarOpen(false) }}
                                            className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all group flex items-center gap-2 md:gap-3 ${activeConvId === conv.id ? 'bg-white/10 text-foreground ring-1 ring-white/10' : 'text-hero-sub hover:bg-white/5 hover:text-foreground'}`}
                                        >
                                            <span className="material-icons text-base md:text-lg opacity-40">chat_bubble_outline</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm font-medium truncate">{conv.title}</p>
                                                <p className="text-[8px] md:text-[10px] opacity-40 uppercase tracking-wider">{formatTime(conv.updatedAt)}</p>
                                            </div>
                                            <button onClick={(e) => handleDeleteConversation(e, conv.id)} className="opacity-0 group-hover:opacity-100 p-1 md:p-1.5 hover:bg-red-500/20 rounded-lg text-red-400">
                                                <span className="material-icons text-xs md:text-sm">delete</span>
                                            </button>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 md:py-12">
                            <span className="material-icons text-hero-sub text-xl mb-2">auto_awesome</span>
                            <p className="text-[9px] md:text-xs text-hero-sub uppercase tracking-widest font-general font-bold">No history</p>
                        </div>
                    )}
                    </AnimatePresence>
                </div>

                <div className="p-3 md:p-4 space-y-1 mt-auto">
                    {[
                        { icon: 'chat', label: 'Assistant', to: '/chat' },
                        { icon: 'visibility', label: 'Vision AI', to: '/image' },
                        { icon: 'mic', label: 'Voice Lab', to: '/voice' },
                    ].map((item) => (
                        <Link key={item.label} to={item.to} className={`flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium transition-all ${window.location.pathname === item.to ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-hero-sub hover:bg-white/5 hover:text-foreground'}`}>
                            <span className="material-icons text-lg md:text-xl">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                    
                    <button 
                        onClick={() => logout()}
                        className="flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all w-full mt-2"
                    >
                        <span className="material-icons text-lg md:text-xl">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10 h-full overflow-hidden">
                {/* Header */}
                <header className="h-14 md:h-20 flex items-center justify-between px-3 md:px-8 bg-background/80 backdrop-blur-xl border-b border-white/5 shrink-0 z-20">
                    <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center rounded-lg md:rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                            <span className="material-icons text-hero-sub text-base md:text-xl">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                        </button>
                        <div className="flex flex-col min-w-0 overflow-hidden">
                            <span className="text-[6px] md:text-[10px] font-general font-bold uppercase tracking-[0.2em] text-primary mb-0.5 truncate opacity-90">Session Status</span>
                            <h2 className="text-[10px] md:text-sm font-general font-bold text-foreground truncate">{activeConvId ? conversations.find(c => c.id === activeConvId)?.title || 'Standard Interface' : 'Initialize CALYX'}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden lg:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-general font-bold text-foreground uppercase tracking-widest">CALYX 4.0 Pro</span>
                        </div>
                        {user ? (
                            <div className="relative">
                                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 md:gap-3 bg-white/5 px-2 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10">
                                    {user.picture ? <img src={user.picture} alt="" className="w-4 h-4 md:w-6 md:h-6 rounded-full" /> : <span className="material-icons text-primary">person</span>}
                                    <span className="text-[9px] md:text-xs font-general font-bold text-foreground hidden xs:block">{user.name.split(' ')[0]}</span>
                                    <span className="material-icons text-sm text-hero-sub">expand_more</span>
                                </button>
                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-3 w-48 md:w-64 liquid-glass rounded-2xl py-2 z-50 border border-white/10 shadow-2xl">
                                            <div className="px-5 py-3 border-b border-white/5 mb-2">
                                                <p className="text-[11px] md:text-sm font-bold text-foreground truncate">{user.name}</p>
                                                <p className="text-[9px] md:text-[10px] text-hero-sub truncate">{user.email}</p>
                                            </div>
                                            <button onClick={() => { logout(); setProfileOpen(false) }} className="w-full text-left px-5 py-3 text-red-400 font-bold text-[10px] md:text-xs flex items-center gap-3 hover:bg-red-500/10 transition-colors">
                                                <span className="material-icons">logout</span> LOGOUT
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link to="/signin" className="bg-primary text-white text-[8px] md:text-[10px] font-bold px-4 py-2 rounded-xl">Sign In</Link>
                        )}
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-6 py-4 md:py-10 min-h-0">
                    <div className="max-w-4xl mx-auto space-y-4 md:space-y-10">
                        {messages.length <= 1 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-8 md:py-20 text-center">
                                <div className="relative w-24 h-24 md:w-40 md:h-40 mb-6 border border-white/10 rounded-[32px] md:rounded-[48px] flex items-center justify-center liquid-glass">
                                    <span className="material-icons text-primary text-4xl md:text-6xl animate-pulse">auto_awesome</span>
                                </div>
                                <h3 className="text-lg md:text-2xl font-general font-bold text-foreground mb-3 tracking-tight">How can I assist you today?</h3>
                                <p className="text-[8px] md:text-[10px] font-geist text-hero-sub uppercase tracking-[0.2em] opacity-60">Neural processing ready • Version 4.0.2</p>
                            </motion.div>
                        )}

                        <AnimatePresence mode="popLayout" initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div key={i} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 md:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className="flex-shrink-0 pt-1">
                                    <div className={`w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl flex items-center justify-center ${msg.role === 'assistant' ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-white/5 border border-white/10'}`}>
                                        <span className="material-icons text-white text-xs md:text-xl">{msg.role === 'assistant' ? 'auto_awesome' : 'person'}</span>
                                    </div>
                                </div>
                                <div className={`max-w-[85%] md:max-w-[80%] space-y-2 relative group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 md:p-6 rounded-[20px] md:rounded-[32px] text-[13px] md:text-[15px] leading-relaxed transition-all ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'liquid-glass border border-white/10 rounded-tl-sm'}`}>
                                        {renderContent(msg.content)}
                                        {msg.role === 'assistant' && (
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(msg.content);
                                                    setCopiedMessageId(`msg-${i}`);
                                                    setTimeout(() => setCopiedMessageId(null), 2000);
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                                            >
                                                <span className="material-icons text-[14px] text-hero-sub">
                                                    {copiedMessageId === `msg-${i}` ? 'check' : 'content_copy'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        </AnimatePresence>
                        {isTyping && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s] mx-1" />
                                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-8 shrink-0 relative z-20">
                    <div className="max-w-4xl mx-auto">
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] text-foreground">
                                        <span className="material-icons text-xs text-primary">description</span>
                                        <span className="truncate max-w-[100px]">{file.name}</span>
                                        <button onClick={() => removeFile(i)} className="hover:text-red-400"><span className="material-icons text-xs">close</span></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-[32px]" />
                            <div className="relative liquid-glass rounded-[24px] md:rounded-[32px] border border-white/10 p-2 md:p-3 flex items-end gap-2 md:gap-3 shadow-2xl">
                                <label className="p-2 md:p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer shrink-0">
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <span className="material-icons text-hero-sub text-xl md:text-2xl">add_circle</span>
                                </label>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                                    placeholder="Ask CALYX anything..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-foreground text-sm md:text-base py-2 md:py-3 resize-none max-h-40 chat-scroll min-h-[44px]"
                                />
                                <div className="flex items-center gap-1 md:gap-2 pb-1 md:pb-1.5 pr-1">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={toggleListening}
                                        className={`p-2 md:p-3 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/5 text-hero-sub'}`}
                                    >
                                        <span className="material-icons text-xl md:text-2xl">{isListening ? 'mic_off' : 'mic'}</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={input.trim() || files.length > 0 ? { scale: 1.05 } : {}}
                                        whileTap={input.trim() || files.length > 0 ? { scale: 0.95 } : {}}
                                        onClick={() => handleSend()}
                                        disabled={!input.trim() && files.length === 0}
                                        className={`p-2 md:p-3 rounded-2xl transition-all ${input.trim() || files.length > 0 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/5 text-white/20'}`}
                                    >
                                        <span className="material-icons text-xl md:text-2xl">north</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[7px] md:text-[10px] font-bold text-hero-sub/40 uppercase tracking-[0.2em] mt-4">
                            CALYX v4.0.2 • Neural Interface Protocol Active
                        </p>
                    </div>
                </div>
            </div>

            {/* Permission Modal */}
            <AnimatePresence>
                {showPermissionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-md liquid-glass border border-white/10 p-6 md:p-8 rounded-[32px] shadow-2xl text-center"
                        >
                            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons text-primary text-3xl">security</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">System Access Protocol</h3>
                            <p className="text-sm text-hero-sub mb-8 leading-relaxed">
                                CALYX is requesting permission to execute system-level commands (opening local apps, system controls). This feature requires the <b>Local CALYX Bridge</b> to be running on your machine.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setShowPermissionModal(false)}
                                    className="px-6 py-3 rounded-2xl border border-white/10 text-hero-sub font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Deny
                                </button>
                                <button 
                                    onClick={() => {
                                        setSystemControlAllowed(true)
                                        localStorage.setItem('systemControlAllowed', 'true')
                                        setShowPermissionModal(false)
                                        addSystemMessage("System Access Protocol authorized.")
                                    }}
                                    className="px-6 py-3 rounded-2xl bg-primary text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all"
                                >
                                    Authorize
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
