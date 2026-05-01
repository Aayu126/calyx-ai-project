import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateImage, checkBackendHealth, getConversations, getConversation } from '../services/api'

const STYLE_OPTIONS = ['Realistic', 'Artistic', '3D Render', 'Anime', 'Sketch', 'Cyberpunk', 'Cinematic']
const SIZE_OPTIONS = ['1024×1024', '1024×1792', '1792×1024'];

export default function ImageGen() {
    const [prompt, setPrompt] = useState('')
    const [style, setStyle] = useState('Realistic')
    const [size, setSize] = useState('1024×1024')
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [history, setHistory] = useState([])
    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        try {
            const data = await getConversations()
            const visionConv = data.conversations.find(c => c.title === 'Vision Gallery')
            if (visionConv) {
                const fullConv = await getConversation(visionConv.id)
                const histImages = fullConv.messages
                    .filter(m => m.role === 'assistant' && m.content.includes('!['))
                    .map(m => {
                        const match = m.content.match(/!\[(.*?)\]\((.*?)\)/)
                        return match ? { prompt: match[1], url: match[2] } : null
                    })
                    .filter(Boolean)
                    .reverse()
                setHistory(histImages)
            }
        } catch (err) {
            console.error('Failed to load history:', err)
        }
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) return

        setLoading(true)
        setError('')
        try {
            const data = await generateImage(`${prompt} in ${style} style`, { style, size, count: 1 })

            if (data.error) {
                setError(data.error)
                return
            }

            const newUrl = data.images?.[0] || data.url
            if (newUrl) {
                const newItem = { prompt, url: newUrl }
                setImages([newItem])
                setHistory(prev => [newItem, ...prev])
            } else {
                setError('Generation failed. Please try again.')
            }
        } catch (err) {
            setError(err.message?.includes('401') ? 'Please sign in to generate.' : 'Connection failed.')
        } finally {
            setLoading(false)
            setPrompt('')
        }
    }

    const handleDownload = (url, promptText) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `calyx_${promptText.replace(/\s+/g, '_').slice(0, 20)}.png`
        link.click()
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
            {/* Ambient Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        x: [0, -40, 0],
                        y: [0, -20, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]"
                />
            </div>

            {/* Sidebar Toggle */}
            <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(!showHistory)}
                className="fixed left-8 bottom-8 z-50 p-5 liquid-glass rounded-[24px] border border-white/10 hover:border-primary/40 transition-all group shadow-2xl"
            >
                <span className="material-icons text-hero-sub group-hover:text-primary transition-colors text-2xl">grid_view</span>
            </motion.button>

            {/* History Sidebar */}
            <AnimatePresence>
                {showHistory && (
                    <motion.aside
                        initial={{ x: -400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="w-[420px] border-r border-white/5 bg-black/40 backdrop-blur-[40px] p-10 overflow-y-auto z-40 relative"
                    >
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-3xl font-general font-bold tracking-tight text-foreground flex items-center gap-3">
                                    Vision Gallery
                                </h2>
                                <p className="text-[10px] text-primary font-black tracking-[0.3em] uppercase mt-2">Neural Archive</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-hero-sub hover:text-white transition-all">
                                <span className="material-icons text-xl">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            {history.length > 0 ? history.map((item, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    className="group relative aspect-square rounded-[24px] overflow-hidden cursor-pointer border border-white/5 hover:border-primary/40 transition-all bg-white/5 shadow-xl"
                                    onClick={() => setImages([item])}
                                >
                                    <img src={item.url} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-4">
                                        <p className="text-[10px] text-white font-geist line-clamp-2 leading-tight font-medium">{item.prompt}</p>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-2 text-center py-40">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="material-icons text-4xl text-white/10">collections_bookmark</span>
                                    </div>
                                    <p className="text-sm font-black tracking-widest uppercase text-white/20">Archive Empty</p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Area */}
            <main className="flex-1 overflow-y-auto relative p-8 md:p-20 scrollbar-hide pt-32">
                <div className="max-w-6xl mx-auto">
                    <motion.header
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-20"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-8"
                        >
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Generative Vision Active</span>
                        </motion.div>
                        <h1 className="text-6xl md:text-8xl font-general font-bold mb-6 tracking-tight leading-[0.9]">
                            From thought <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-500 italic">
                                to masterpiece
                            </span>
                        </h1>
                        <p className="text-xl text-hero-sub font-geist max-w-2xl mx-auto leading-relaxed">
                            Calyx neural engine transforms your descriptions into high-fidelity visual structures in real-time.
                        </p>
                    </motion.header>

                    {/* Input Panel */}
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="relative group mb-24"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />
                        <div className="relative liquid-glass rounded-[40px] border border-white/10 p-10 shadow-3xl">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your vision in detail..."
                                className="w-full bg-transparent border-none text-2xl md:text-3xl font-general font-medium text-foreground placeholder-white/10 focus:ring-0 resize-none min-h-[140px] mb-10 scrollbar-hide"
                            />
                            
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-10 border-t border-white/5">
                                <div className="flex flex-col gap-4">
                                    <label className="text-[10px] font-black text-hero-sub tracking-[0.3em] uppercase ml-1">Aesthetic Signature</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {STYLE_OPTIONS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStyle(s)}
                                                className={`px-6 py-2.5 rounded-xl text-[11px] font-black tracking-wider transition-all duration-300 ${
                                                    style === s 
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                                                    : 'bg-white/5 text-hero-sub hover:bg-white/10 hover:text-foreground border border-white/5'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-5">
                                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                                        <label className="text-[10px] font-black text-hero-sub tracking-[0.3em] uppercase ml-1">Dimensions</label>
                                        <select 
                                            value={size}
                                            onChange={(e) => setSize(e.target.value)}
                                            className="bg-white/5 border-white/10 border rounded-xl text-[11px] font-black px-6 py-3 focus:ring-primary focus:border-primary transition-all cursor-pointer text-foreground appearance-none hover:bg-white/10"
                                        >
                                            {SIZE_OPTIONS.map(s => <option key={s} value={s} className="bg-[#02040a]">{s}</option>)}
                                        </select>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleGenerate}
                                        disabled={loading || !prompt.trim()}
                                        className="w-full sm:w-auto px-12 py-5 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-primary/25 disabled:opacity-50 transition-all uppercase tracking-[0.2em] relative overflow-hidden group/btn"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                <span>Synthesizing</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="material-icons text-xl">tempest</span>
                                                <span>Generate</span>
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Result Area */}
                    <div className="relative min-h-[700px] flex items-center justify-center mb-32">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-10"
                                >
                                    <div className="relative w-56 h-56">
                                        <motion.div 
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 border-t-2 border-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                        />
                                        <motion.div 
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-6 border-b-2 border-purple-500 rounded-full"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <motion.div 
                                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="w-24 h-24 bg-primary/20 blur-2xl rounded-full"
                                            />
                                            <span className="material-icons text-primary text-7xl relative z-10">blur_on</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-primary font-black tracking-[0.6em] uppercase text-xs mb-4">Neural Synthesis in Progress</p>
                                        <p className="text-hero-sub text-sm font-geist italic">Assembling sub-atomic light patterns...</p>
                                    </div>
                                </motion.div>
                            ) : images.length > 0 ? (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="w-full relative group"
                                >
                                    <div className="absolute -inset-10 bg-primary/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                    <div className="relative rounded-[48px] overflow-hidden border border-white/10 shadow-3xl bg-black">
                                        <img 
                                            src={images[0].url} 
                                            alt={images[0].prompt} 
                                            className="w-full h-auto max-h-[85vh] object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col justify-end p-12 md:p-16">
                                            <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                                                <div className="flex-1">
                                                    <p className="text-white font-general font-bold text-3xl md:text-4xl leading-tight mb-6 tracking-tight">"{images[0].prompt}"</p>
                                                    <div className="flex gap-3">
                                                        <span className="px-5 py-2 bg-white/10 backdrop-blur-2xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-white">{style}</span>
                                                        <span className="px-5 py-2 bg-white/10 backdrop-blur-2xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-white">{size}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-5">
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1, y: -5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDownload(images[0].url, images[0].prompt)}
                                                        className="w-20 h-20 bg-primary text-white rounded-[28px] flex items-center justify-center shadow-2xl hover:bg-blue-600 transition-all"
                                                    >
                                                        <span className="material-icons text-3xl">download</span>
                                                    </motion.button>
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1, y: -5 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => window.open(images[0].url, '_blank')}
                                                        className="w-20 h-20 bg-white/5 backdrop-blur-3xl border border-white/10 text-white rounded-[28px] flex items-center justify-center hover:bg-white/10 transition-all shadow-2xl"
                                                    >
                                                        <span className="material-icons text-3xl">fullscreen</span>
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center opacity-10 group"
                                >
                                    <div className="w-80 h-80 border-2 border-dashed border-white/10 rounded-[64px] flex items-center justify-center mb-12 group-hover:border-primary/40 group-hover:scale-105 transition-all duration-1000">
                                        <span className="material-icons text-[120px] group-hover:text-primary transition-all duration-1000 animate-pulse">auto_awesome</span>
                                    </div>
                                    <p className="text-3xl font-general font-bold tracking-tight text-foreground">Awaiting Input</p>
                                    <p className="text-[11px] font-black tracking-[0.4em] uppercase mt-3 text-hero-sub">Neural link standby</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 8s ease infinite;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}} />
        </div>
    )
}
