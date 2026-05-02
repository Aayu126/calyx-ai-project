import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { transcribeAudio, textToSpeech } from '../services/api'

const LANGUAGES = [
    { label: 'Auto Detect', code: '' },
    { label: 'English', code: 'en-US' },
    { label: 'Spanish', code: 'es-ES' },
    { label: 'French', code: 'fr-FR' },
    { label: 'German', code: 'de-DE' },
    { label: 'Hindi', code: 'hi-IN' },
    { label: 'Marathi', code: 'mr-IN' },
    { label: 'Japanese', code: 'ja-JP' },
]

export default function Voice() {
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimText, setInterimText] = useState('')
    const [listening, setListening] = useState(false)
    const [ttsText, setTtsText] = useState('')
    const [playing, setPlaying] = useState(false)
    const [selectedLang, setSelectedLang] = useState('')   // '' = auto detect
    const [detectedLang, setDetectedLang] = useState('')
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const recognitionRef = useRef(null)

    // Build / rebuild recognition whenever the selected language changes
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return

        // Stop any existing session
        recognitionRef.current?.abort()

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        // '' lets the browser use the OS default / auto-detect
        recognition.lang = selectedLang

        recognition.onresult = (event) => {
            let finalChunk = ''
            let interimChunk = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                if (result.isFinal) {
                    finalChunk += result[0].transcript
                    // Surface detected language tag if available
                    if (result[0].lang) setDetectedLang(result[0].lang)
                } else {
                    interimChunk += result[0].transcript
                }
            }

            if (finalChunk) {
                setTranscript((prev) => {
                    if (prev && !prev.endsWith(' ') && !prev.endsWith('.') && !prev.endsWith('\n')) {
                        return prev + ' ' + finalChunk.trim()
                    }
                    return prev + finalChunk.trim()
                })
                setInterimText('')
            }

            if (interimChunk) setInterimText(interimChunk)
        }

        recognition.onerror = (e) => {
            console.warn('Speech recognition error:', e.error)
            setListening(false)
        }
        recognition.onend = () => {
            setListening(false)
            setInterimText('')
        }

        recognitionRef.current = recognition
    }, [selectedLang])

    const toggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false)
            setListening(false)
            recognitionRef.current?.stop()
            mediaRecorderRef.current?.stop()
        } else {
            setIsRecording(true)
            setTranscript('')
            setDetectedLang('')

            // Start live Web Speech API transcription
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start()
                    setListening(true)
                } catch {
                    // already started
                }
            }

            // Also record audio for backend Whisper transcription
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const mediaRecorder = new MediaRecorder(stream)
                chunksRef.current = []

                mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data)
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
                    stream.getTracks().forEach((t) => t.stop())

                    try {
                        const data = await transcribeAudio(audioBlob)
                        if (data.text) setTranscript(data.text)
                    } catch {
                        // Keep browser transcription if backend fails
                    }
                }

                mediaRecorder.start()
                mediaRecorderRef.current = mediaRecorder
            } catch {
                // Mic permission denied — rely on Web Speech API only
            }
        }
    }

    const handleTTS = async () => {
        if (!ttsText.trim()) return
        setPlaying(true)
        try {
            const blob = await textToSpeech(ttsText)
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => setPlaying(false)
            audio.play()
        } catch {
            // Fallback: browser TTS
            const utterance = new SpeechSynthesisUtterance(ttsText)
            utterance.onend = () => setPlaying(false)
            speechSynthesis.speak(utterance)
        }
    }

    return (
        <main className="relative pt-24 md:pt-32 pb-16 md:pb-24 min-h-screen overflow-hidden bg-[#050505]">
            {/* Ambient Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] orb-gradient rounded-full pointer-events-none opacity-[0.15] blur-[80px] md:blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] orb-gradient rounded-full pointer-events-none opacity-[0.1] blur-[80px] md:blur-[100px]" />

            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-5xl mx-auto px-4 md:px-6"
            >
                {/* Header */}
                <div className="text-center mb-10 md:mb-16">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full liquid-glass text-primary text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase mb-6 md:mb-8"
                    >
                        <span className="material-icons text-xs md:text-sm">mic</span>
                        Neural Voice Engine
                    </motion.div>
                    <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-4 md:mb-6 font-general">
                        Beyond <span className="text-primary text-glow italic">Words</span>
                    </h1>
                    <p className="text-base md:text-lg text-foreground/60 max-w-2xl mx-auto font-geist px-4">
                        Experience lightning-fast transcription and human-like synthesis. 
                        Multilingual, real-time, and powered by advanced neural networks.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 md:gap-10">
                    {/* Speech to Text Section */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="liquid-glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border-white/[0.05]"
                    >
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <h2 className="text-lg md:text-xl font-bold flex items-center gap-3 font-general">
                                <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-icons text-primary text-sm">hearing</span>
                                </span>
                                Voice to Text
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                                    {isRecording ? 'Live' : 'Standby'}
                                </span>
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div className="mb-6 md:mb-8">
                            <label className="block text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40 mb-4">
                                Detection Mode
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            setSelectedLang(lang.code)
                                            setDetectedLang('')
                                        }}
                                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-medium transition-all duration-300 border ${
                                            selectedLang === lang.code
                                                ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(19,127,236,0.3)]'
                                                : 'bg-white/[0.03] text-foreground/60 border-white/[0.05] hover:border-primary/40 hover:bg-primary/5'
                                        }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                            <AnimatePresence>
                                {detectedLang && (
                                    <motion.p 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[10px] md:text-[11px] text-emerald-400 mt-4 flex items-center gap-2 font-medium"
                                    >
                                        <span className="material-icons text-xs">auto_awesome</span>
                                        Detected: <span className="uppercase tracking-widest">{detectedLang}</span>
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mic Button & Control */}
                        <div className="flex flex-col items-center mb-8 md:mb-10 py-2 md:py-4">
                            <div className="relative group">
                                <AnimatePresence>
                                    {isRecording && (
                                        <>
                                            <motion.div 
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1.4, opacity: 0 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="absolute inset-0 rounded-full bg-primary/20"
                                            />
                                            <motion.div 
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1.8, opacity: 0 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                                className="absolute inset-0 rounded-full bg-primary/10"
                                            />
                                        </>
                                    )}
                                </AnimatePresence>
                                <button
                                    onClick={toggleRecording}
                                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-500 z-10 ${
                                        isRecording
                                        ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110'
                                        : 'bg-primary shadow-[0_0_30px_rgba(19,127,236,0.3)] hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    <span className="material-icons text-white text-3xl md:text-4xl">
                                        {isRecording ? 'stop' : 'mic'}
                                    </span>
                                </button>
                            </div>
                            <p className="text-xs md:text-sm text-foreground/40 mt-6 md:mt-8 font-geist text-center">
                                {isRecording ? 'Capturing audio stream...' : 'Click to start neural transcription'}
                            </p>
                        </div>

                        {/* Transcription Box */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                            <div className="relative min-h-[140px] md:min-h-[160px] bg-white/[0.02] rounded-[1.25rem] md:rounded-[1.5rem] p-5 md:p-6 border border-white/[0.08] font-geist">
                                {(transcript || interimText) ? (
                                    <div className="text-sm md:text-base leading-relaxed text-foreground/90">
                                        {transcript}
                                        {interimText && (
                                            <span className="text-primary/60 italic ml-1 transition-opacity duration-300">
                                                {interimText}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-foreground/20 italic text-sm text-center py-4">
                                        <span className="material-icons text-2xl md:text-3xl mb-3 opacity-20">notes</span>
                                        {isRecording ? 'Processing voice signals...' : 'Your transcription will emerge here'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {transcript && (
                            <div className="flex gap-3 md:gap-4 mt-5 md:mt-6">
                                <button
                                    onClick={() => navigator.clipboard.writeText(transcript)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-[10px] md:text-xs font-bold uppercase tracking-widest py-3.5 md:py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/[0.05]"
                                >
                                    <span className="material-icons text-sm">content_copy</span>
                                    Copy
                                </button>
                                <button
                                    onClick={() => setTranscript('')}
                                    className="px-5 md:px-6 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-white/[0.05]"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Text to Speech Section */}
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="liquid-glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border-white/[0.05]"
                    >
                        <h2 className="text-lg md:text-xl font-bold mb-6 md:mb-8 flex items-center gap-3 font-general">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-icons text-primary text-sm">record_voice_over</span>
                            </span>
                            Neural Synthesis
                        </h2>

                        <div className="relative group mb-5 md:mb-6">
                            <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                            <textarea
                                value={ttsText}
                                onChange={(e) => setTtsText(e.target.value)}
                                placeholder="Enter text for high-fidelity synthesis..."
                                className="relative w-full bg-white/[0.02] border border-white/[0.08] rounded-[1.25rem] md:rounded-[1.5rem] p-5 md:p-6 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:outline-none resize-none text-sm md:text-base placeholder-foreground/20 text-foreground/90 min-h-[180px] md:min-h-[220px] font-geist"
                            />
                        </div>

                        {/* Waveform / Playback UI */}
                        <AnimatePresence>
                            {playing && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-5 md:mb-6 overflow-hidden"
                                >
                                    <div className="bg-primary/5 rounded-[1.25rem] md:rounded-[1.5rem] p-4 md:p-6 border border-primary/10 flex items-center gap-4 md:gap-6">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(19,127,236,0.3)] shrink-0">
                                            <span className="material-icons text-white text-xl">graphic_eq</span>
                                        </div>
                                        <div className="flex-1 flex items-center gap-0.5 md:gap-1 h-8 md:h-10">
                                            {[...Array(window.innerWidth < 768 ? 16 : 24)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ 
                                                        height: [6, 20, 10, 28, 14],
                                                        opacity: [0.3, 0.6, 0.3]
                                                    }}
                                                    transition={{ 
                                                        repeat: Infinity, 
                                                        duration: 0.8,
                                                        delay: i * 0.05 
                                                    }}
                                                    className="flex-1 bg-primary/40 rounded-full"
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[9px] md:text-[10px] font-mono text-primary font-bold">LIVE</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleTTS}
                            disabled={!ttsText.trim() || playing}
                            className={`w-full py-4 md:py-5 rounded-[1.25rem] md:rounded-[1.5rem] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 ${
                                ttsText.trim() && !playing
                                ? 'bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.2)] hover:shadow-[0_0_50px_rgba(19,127,236,0.4)] md:hover:-translate-y-1'
                                : 'bg-white/[0.03] text-foreground/20 border border-white/[0.05] cursor-not-allowed'
                            }`}
                        >
                            {playing ? (
                                <>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-white animate-bounce" />
                                        <div className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                    Synthesizing...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-lg md:text-xl">play_circle</span>
                                    Synthesize Speech
                                </>
                            )}
                        </button>

                        <div className="mt-8 md:mt-10">
                            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40 mb-4">Core Voice Models</p>
                            <div className="flex flex-wrap gap-2">
                                {['English', 'Spanish', 'French', 'German', 'Hindi', 'Marathi', 'Japanese'].map((lang) => (
                                    <span key={lang} className="px-2.5 py-1.5 md:px-3 md:py-1.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[9px] md:text-[10px] font-bold text-foreground/60 uppercase tracking-widest">{lang}</span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>
        </main>
    )
}
