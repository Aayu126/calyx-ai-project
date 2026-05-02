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
    const [isSupported, setIsSupported] = useState(true)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const recognitionRef = useRef(null)

    // Build / rebuild recognition whenever the selected language changes
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false)
            return;
        }

        // Stop any existing session
        recognitionRef.current?.abort()

        const recognition = new SpeechRecognition()
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        recognition.continuous = !isMobile;
        recognition.interimResults = true;
        // '' lets the browser use the OS default / auto-detect
        recognition.lang = selectedLang || 'en-US'

        recognition.onresult = (event) => {
            let finalChunk = ''
            let interimChunk = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                if (result.isFinal) {
                    finalChunk += result[0].transcript
                    if (result[0].lang) setDetectedLang(result[0].lang)
                } else {
                    interimChunk += result[0].transcript
                }
            }

            if (finalChunk) {
                setTranscript((prev) => {
                    const separator = (prev && !prev.endsWith(' ') && !prev.endsWith('.') && !prev.endsWith('\n')) ? ' ' : ''
                    return prev + separator + finalChunk.trim()
                })
                setInterimText('')
            }
            if (interimChunk) setInterimText(interimChunk)
        }

        recognition.onstart = () => {
            setListening(true);
            setInterimText('');
        };

        recognition.onerror = (e) => {
            console.warn('Speech recognition error:', e.error)
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                setIsRecording(false)
                setListening(false)
            }
            // Auto-restart on some non-fatal errors if recording
            if (isRecording && (e.error === 'network' || e.error === 'no-speech')) {
                try { recognition.start(); } catch(err) {}
            }
        }

        recognition.onend = () => {
            // On mobile, recognition often stops automatically.
            // If we are still 'recording', try to restart.
            if (isRecording) {
                try {
                    recognition.start()
                } catch {
                    setListening(false)
                    setInterimText('')
                }
            } else {
                setListening(false)
                setInterimText('')
            }
        }

        recognitionRef.current = recognition
        
        return () => {
            recognition.abort();
        };
    }, [selectedLang, isRecording])

    const toggleRecording = async () => {
        if (isRecording) {
            setIsRecording(false)
            setListening(false)
            recognitionRef.current?.stop()
            mediaRecorderRef.current?.stop()
        } else {
            // Clear previous state
            setTranscript('')
            setInterimText('')
            setDetectedLang('')
            setIsRecording(true)

            // Start live Web Speech API transcription
            if (recognitionRef.current) {
                try {
                    // Mobile browsers require a fresh start call in the click handler
                    // Abort any previous session first to ensure a clean state
                    recognitionRef.current.abort()
                    
                    // Small delay to ensure abort finished, but keep it within user interaction window
                    // Actually, calling start() directly after abort() often works if the browser handles it
                    recognitionRef.current.start()
                } catch (e) {
                    console.error("Recognition start error:", e)
                }
            }

            // Also record audio for backend Whisper transcription
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                
                // Detection for mobile-friendly mime types
                // iOS Safari specifically prefers audio/mp4 or audio/aac
                const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
                    ? 'audio/webm' 
                    : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/ogg')
                
                const mediaRecorder = new MediaRecorder(stream, { mimeType })
                chunksRef.current = []

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data)
                }
                
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(chunksRef.current, { type: mimeType })
                    stream.getTracks().forEach((t) => t.stop())

                    try {
                        const data = await transcribeAudio(audioBlob, selectedLang)
                        if (data.text && data.text.trim().length > (transcript || '').length) {
                            setTranscript(data.text)
                        }
                    } catch (err) {
                        console.error("Backend transcription failed:", err)
                    }
                }

                mediaRecorder.start()
                mediaRecorderRef.current = mediaRecorder
            } catch (err) {
                console.error("Mic access failed:", err)
                setIsRecording(false)
                setListening(false)
                alert("Microphone access was denied or failed. Please check your browser permissions.")
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
            audio.onended = () => {
                setPlaying(false)
                URL.revokeObjectURL(url)
            }
            audio.play()
        } catch {
            // Fallback: browser TTS
            const utterance = new SpeechSynthesisUtterance(ttsText)
            utterance.onend = () => setPlaying(false)
            speechSynthesis.speak(utterance)
        }
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-[#050505] text-white font-geist selection:bg-primary/30 selection:text-primary-foreground overflow-hidden">
            {/* Header */}
            <nav className="h-16 md:h-20 shrink-0 flex items-center justify-between px-4 md:px-12 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 relative z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 p-[1px]">
                        <div className="w-full h-full rounded-[15px] bg-[#050505] flex items-center justify-center">
                            <span className="material-icons text-primary text-xl">graphic_eq</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight">CALYX <span className="text-primary italic">VOICE</span></h2>
                        <p className="text-[10px] text-foreground/40 font-medium uppercase tracking-widest">Neural Audio</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                            <span className="text-[10px] font-bold text-foreground/40">ENGINE READY</span>
                        </div>
                        <div className="w-[1px] h-3 bg-white/10" />
                        <span className="text-[10px] font-bold text-primary">v3.0.4-Stable</span>
                    </div>
                </div>
            </nav>

            <main className="flex-1 overflow-y-auto relative p-4 md:p-8 chat-scroll min-h-0">
                {/* Ambient background for depth */}
                <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-5xl mx-auto"
                >
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

                            {!isSupported && (
                                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                                    <span className="material-icons text-amber-500 text-lg">warning</span>
                                    <p className="text-[10px] md:text-xs text-amber-200/80 font-medium">
                                        Voice recognition is not supported in this browser. Please try Chrome or Safari.
                                    </p>
                                </div>
                            )}

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
                                    {isRecording 
                                        ? (listening ? 'Listening to voice signals...' : 'Initializing audio stream...') 
                                        : 'Click to start neural transcription'
                                    }
                                </p>
                            </div>

                            {/* Transcription Box */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                                <div className="relative min-h-[140px] md:min-h-[160px] bg-white/[0.02] rounded-[1.25rem] md:rounded-[1.5rem] p-5 md:p-6 border border-white/[0.08] font-geist">
                                    {isRecording && listening && (
                                        <div className="absolute top-4 right-4 flex gap-1 h-3 items-center">
                                            {[...Array(4)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [2, 10, 2] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                    className="w-0.5 bg-primary rounded-full"
                                                />
                                            ))}
                                        </div>
                                    )}
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
                                                {[...Array(30)].map((_, i) => (
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
                                                        className={`flex-1 bg-primary/40 rounded-full ${i > 15 ? 'hidden sm:block' : ''}`}
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
        </div>
    )
}
