import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { transcribeAudio, textToSpeech } from '../services/api'

class VoiceErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Voice Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-background/50 backdrop-blur-xl rounded-3xl border border-white/10 mt-20">
                    <span className="material-icons text-5xl text-red-500 mb-4">error_outline</span>
                    <h2 className="text-2xl font-bold mb-2">Voice Engine Encountered an Issue</h2>
                    <p className="text-foreground/60 mb-6">The browser's speech recognition might have lost connection.</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary rounded-full font-bold">Restart Voice Module</button>
                </div>
            );
        }
        return this.props.children;
    }
}

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

function VoiceContent() {
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimText, setInterimText] = useState('')
    const [listening, setListening] = useState(false)
    const [ttsText, setTtsText] = useState('')
    const [playing, setPlaying] = useState(false)
    const [selectedLang, setSelectedLang] = useState('')
    const [detectedLang, setDetectedLang] = useState('')
    const [isSupported, setIsSupported] = useState(true)
    const [isSecureContext, setIsSecureContext] = useState(true)
    const [ttsError, setTtsError] = useState('')
    const [volumeBars, setVolumeBars] = useState(new Array(16).fill(4))
    const [micPermissionGranted, setMicPermissionGranted] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isCheckingPermission, setIsCheckingPermission] = useState(true)
    
    const recognitionRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const animationFrameRef = useRef(null)
    const isRecordingRef = useRef(false)
    const ttsAudioRef = useRef(null)
    const streamRef = useRef(null)
    const selectedLangRef = useRef('')
    const transcriptRef = useRef('')

    useEffect(() => {
        isRecordingRef.current = isRecording
    }, [isRecording])

    useEffect(() => {
        selectedLangRef.current = selectedLang
    }, [selectedLang])

    useEffect(() => {
        transcriptRef.current = transcript
    }, [transcript])

    useEffect(() => {
        const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        setIsMobile(mobile)
        setIsSecureContext(window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost')
        
        // Check if permission was already granted
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const hasLabel = devices.some(d => d.kind === 'audioinput' && d.label);
                if (hasLabel) {
                    setMicPermissionGranted(true);
                }
                setIsCheckingPermission(false);
            }).catch(() => {
                setIsCheckingPermission(false);
            });
        } else {
            setIsCheckingPermission(false);
        }
    }, [])

    const handleRequestPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setMicPermissionGranted(true);
            return true;
        } catch (err) {
            console.error("Microphone permission denied:", err);
            return false;
        }
    };

    const unlockAudioContext = useCallback(async () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume()
        }
    }, [])

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setIsSupported(false)
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.onend = () => {}
            recognitionRef.current.abort()
        }

        const recognition = new SpeechRecognition()
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        
        recognition.continuous = !isIOS
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        // Robust language selection for mobile
        const defaultLang = navigator.language || 'en-US'
        recognition.lang = selectedLang || defaultLang

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
                    const clean = finalChunk.trim()
                    if (!clean) return prev
                    const separator = (prev && !prev.endsWith(' ') && !prev.endsWith('.') && !prev.endsWith('\n')) ? ' ' : ''
                    return prev + separator + clean
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
                isRecordingRef.current = false
            }
            if (e.error === 'aborted') return
            if (e.error === 'network') {
                console.warn('Network error - trying to continue...')
            }
        }

        recognition.onend = () => {
            setListening(false)
            if (isRecordingRef.current) {
                try {
                    recognition.start()
                    setListening(true)
                } catch(err) {
                    console.warn("Recognition restart failed:", err)
                    setTimeout(() => {
                        if (isRecordingRef.current) {
                            try {
                                recognition.start()
                                setListening(true)
                            } catch(e) {}
                        }
                    }, 100)
                }
            }
        }

        recognitionRef.current = recognition
        
        return () => {
            recognition.onend = () => {}
            recognition.abort();
        };
    }, [selectedLang])

    const startVisualizer = useCallback((stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        analyser.fftSize = isMobile ? 128 : 256
        analyser.smoothingTimeConstant = 0.5
        
        analyserRef.current = analyser
        audioContextRef.current = audioContext

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray)
            const bars = new Array(16).fill(0)
            const step = Math.floor(bufferLength / 16)
            
            for (let i = 0; i < 16; i++) {
                let sum = 0
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j] || 0
                }
                bars[i] = Math.max(4, (sum / step) * 0.5)
            }
            
            setVolumeBars(bars)
            
            if (isRecordingRef.current) {
                animationFrameRef.current = requestAnimationFrame(updateVolume)
            }
        }
        updateVolume()
    }, [])

    const stopAllRecording = useCallback(() => {
        setIsRecording(false)
        setListening(false)
        isRecordingRef.current = false
        setVolumeBars(new Array(16).fill(4))
        
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch(e) {}
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch(e) {}
        }
    }, [])

    const toggleRecording = async () => {
        if (isRecording) {
            stopAllRecording()
        } else {
            setTranscript('')
            setInterimText('')
            setDetectedLang('')
            setTtsError('')
            transcriptRef.current = ''
            
            setIsRecording(true)
            isRecordingRef.current = true

            if (isMobile && !micPermissionGranted) {
                const granted = await handleRequestPermission();
                if (!granted) {
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    return;
                }
            }

            unlockAudioContext()

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start()
                } catch (e) {
                    console.error("Recognition start error:", e)
                    // On some mobile browsers, we might need to restart recognition 
                    // after a small delay if it was already "running" but stuck
                    if (e.name === 'InvalidStateError') {
                        try { recognitionRef.current.stop(); } catch(i) {}
                        setTimeout(() => {
                            if (isRecordingRef.current) recognitionRef.current.start();
                        }, 200);
                    }
                }
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true
                })
                streamRef.current = stream
                startVisualizer(stream)
                
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                let mimeType = 'audio/webm'
                
                if (isMobile) {
                    if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        mimeType = 'audio/mp4'
                    } else if (MediaRecorder.isTypeSupported('audio/3gpp')) {
                        mimeType = 'audio/3gpp'
                    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                        mimeType = 'audio/webm'
                    }
                } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus'
                }
                
                const mediaRecorder = new MediaRecorder(stream, { 
                    mimeType,
                    audioBitsPerSecond: isMobile ? 64000 : 128000 
                })
                chunksRef.current = []

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data)
                }
                
                mediaRecorder.onstop = () => {
                    setIsTranscribing(true)
                    const audioBlob = new Blob(chunksRef.current, { type: mimeType })
                    const lang = selectedLangRef.current
                    
                    transcribeAudio(audioBlob, lang).then((data) => {
                        if (data && data.text && data.text.trim().length > 0) {
                            const clean = data.text.trim()
                            const prev = transcriptRef.current
                            if (!prev || clean.length > prev.length) {
                                setTranscript(clean)
                                transcriptRef.current = clean
                            }
                        }
                    }).catch((err) => {
                        console.error("Backend transcription failed:", err)
                        setTtsError("Transcription failed: " + err.message)
                    }).finally(() => {
                        setIsTranscribing(false)
                    })
                }

                mediaRecorder.start()
                mediaRecorderRef.current = mediaRecorder
            } catch (err) {
                console.error("Microphone access error:", err)
                stopAllRecording()
            }
        }
    }

    const handleTTS = async () => {
        if (!ttsText.trim()) return
        setPlaying(true)
        setTtsError('')
        
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause()
            ttsAudioRef.current = null
        }

        try {
            const blob = await textToSpeech(ttsText)
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            ttsAudioRef.current = audio
            
            audio.addEventListener('ended', () => {
                setPlaying(false)
                URL.revokeObjectURL(url)
                ttsAudioRef.current = null
            })
            
            audio.addEventListener('error', () => {
                setPlaying(false)
                URL.revokeObjectURL(url)
                ttsAudioRef.current = null
                setTtsError('Playback failed. Trying browser speech synthesis...')
                fallbackBrowserTTS(ttsText)
            })

            const playPromise = audio.play()
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    console.warn("Audio play failed:", err)
                    URL.revokeObjectURL(url)
                    ttsAudioRef.current = null
                    setTtsError('Autoplay blocked. Tap to try again.')
                    setPlaying(false)
                })
            }
        } catch (err) {
            console.error("TTS failed:", err)
            setPlaying(false)
            setTtsError('Backend TTS unavailable. Using browser speech...')
            fallbackBrowserTTS(ttsText)
        }
    }

    const fallbackBrowserTTS = useCallback((text) => {
        if (!window.speechSynthesis) {
            setTtsError('Speech synthesis not supported on this device')
            return
        }
        
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        const langCode = selectedLang || 'en-US'
        utterance.lang = langCode
        utterance.rate = 1.0
        utterance.pitch = 1.0
        
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
            const preferred = voices.find(v => v.lang.startsWith(langCode.split('-')[0]))
            if (preferred) utterance.voice = preferred
        }
        
        utterance.onstart = () => setPlaying(true)
        utterance.onend = () => setPlaying(false)
        utterance.onerror = () => setPlaying(false)
        
        window.speechSynthesis.speak(utterance)
    }, [selectedLang])

    useEffect(() => {
        if (window.speechSynthesis && window.speechSynthesis.getVoices) {
            window.speechSynthesis.getVoices()
        }
    }, [])

    const stopPlayback = useCallback(() => {
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause()
            ttsAudioRef.current = null
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel()
        }
        setPlaying(false)
        setTtsError('')
    }, [])

    useEffect(() => {
        return () => {
            stopAllRecording()
            stopPlayback()
        }
    }, [stopAllRecording, stopPlayback])

    if (!isSupported) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center mt-20">
                <span className="material-icons text-6xl text-red-500 mb-6">no_meals</span>
                <h2 className="text-2xl font-bold mb-4">Speech Recognition Not Supported</h2>
                <p className="text-foreground/60 max-w-md mx-auto">
                    Your browser does not support the Web Speech API. 
                    Please try Chrome, Edge, or Safari on a modern device.
                </p>
            </div>
        )
    }

    if (!isSecureContext) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center mt-20">
                <span className="material-icons text-6xl text-yellow-500 mb-6">lock_open</span>
                <h2 className="text-2xl font-bold mb-4">Secure Connection Required</h2>
                <p className="text-foreground/60 max-w-md mx-auto">
                    Voice features require HTTPS. Please access this site via a secure connection.
                </p>
            </div>
        )
    }

    if (isMobile && !micPermissionGranted && !isCheckingPermission) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center selection:bg-primary/30 font-geist">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="liquid-glass p-10 rounded-[2.5rem] border-white/[0.05] max-w-sm w-full"
                >
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                        <span className="material-icons text-4xl text-primary relative">mic</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Enable Microphone</h2>
                    <p className="text-foreground/60 text-sm leading-relaxed mb-10">
                        Calyx AI needs microphone access to process your voice and provide intelligent responses.
                    </p>
                    <button 
                        onClick={handleRequestPermission}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(19,127,236,0.3)] hover:shadow-[0_0_50px_rgba(19,127,236,0.5)] transition-all active:scale-95"
                    >
                        Grant Permission
                    </button>
                    <p className="mt-6 text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
                        Standard browser security protocol
                    </p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="text-foreground font-geist selection:bg-primary/30">
            <main className="pt-24 md:pt-32 pb-20">
                <motion.section 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-7xl mx-auto px-4 md:px-8"
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                                Neural Interface v2.0
                            </span>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">
                                Voice <span className="text-primary">Intelligence</span>
                            </h1>
                            <p className="text-foreground/60 max-w-xl text-lg leading-relaxed">
                                Experience high-fidelity multilingual speech recognition and synthesis powered by advanced neural models.
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col gap-3"
                        >
                            <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Input Language</label>
                            <select 
                                value={selectedLang}
                                onChange={(e) => setSelectedLang(e.target.value)}
                                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all cursor-pointer min-w-[240px] backdrop-blur-md"
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code} className="bg-[#0f0f0f]">{lang.label}</option>
                                ))}
                            </select>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="liquid-glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border-white/[0.05]"
                        >
                            <div className="flex items-center justify-between mb-10 md:mb-12">
                                <h2 className="text-lg md:text-xl font-bold flex items-center gap-3 font-general">
                                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <span className="material-icons text-primary text-sm">settings_voice</span>
                                    </span>
                                    Audio Capture
                                </h2>
                                {isRecording && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80">Recording</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center mb-10 md:mb-12">
                                <div className="relative mb-10">
                                    <div className={`absolute inset-0 bg-primary/20 blur-[60px] transition-opacity duration-1000 ${isRecording ? 'opacity-100' : 'opacity-0'}`} />
                                    <button
                                        onClick={toggleRecording}
                                        className={`relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-500 active:scale-95 ${
                                            isRecording 
                                            ? 'bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]' 
                                            : 'bg-primary shadow-[0_0_50px_rgba(19,127,236,0.3)]'
                                        }`}
                                    >
                                        <span className="material-icons text-white text-4xl md:text-5xl">
                                            {isRecording ? 'stop' : 'mic'}
                                        </span>
                                        
                                        <AnimatePresence>
                                            {isRecording && (
                                                <>
                                                    {[1, 2, 3].map((i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ scale: 1, opacity: 0.5 }}
                                                            animate={{ scale: 2.2, opacity: 0 }}
                                                            transition={{ 
                                                                repeat: Infinity, 
                                                                duration: 2,
                                                                delay: i * 0.6,
                                                                ease: "easeOut"
                                                            }}
                                                            className="absolute inset-0 rounded-full border-2 border-red-500/30"
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>

                                {isRecording && (
                                    <div className="flex items-end gap-1 h-12 mb-8">
                                        {volumeBars.map((height, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{ height }}
                                                className="w-1.5 md:w-2 bg-primary/40 rounded-full"
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative group">
                                <div className={`absolute -inset-[1px] bg-gradient-to-r from-primary/20 via-blue-500/20 to-emerald-500/20 blur-[2px] rounded-[1.5rem] transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`} />
                                <div className="relative min-h-[140px] md:min-h-[160px] bg-white/[0.02] rounded-[1.25rem] md:rounded-[1.5rem] p-5 md:p-6 border border-white/[0.08] font-geist backdrop-blur-sm">
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
                                            {isRecording ? 'Processing voice signals...' : isTranscribing ? 'Finalizing transcription...' : 'Your transcription will emerge here'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {transcript && (
                                <div className="flex gap-3 md:gap-4 mt-5 md:mt-6">
                                    <button
                                        onClick={() => {
                                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                                navigator.clipboard.writeText(transcript)
                                            }
                                        }}
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

                            {ttsError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs"
                                >
                                    {ttsError}
                                </motion.div>
                            )}

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
                                            <button 
                                                onClick={stopPlayback}
                                                className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors shrink-0"
                                            >
                                                <span className="material-icons text-red-400 text-sm">stop</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleTTS}
                                disabled={!ttsText.trim() || playing}
                                className={`w-full py-4 md:py-5 rounded-[1.25rem] md:rounded-[1.5rem] text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 ${
                                    ttsText.trim() && !playing
                                    ? 'bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.2)] hover:shadow-[0_0_50px_rgba(19,127,236,0.4)]'
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

export default function Voice() {
    return (
        <VoiceErrorBoundary>
            <VoiceContent />
        </VoiceErrorBoundary>
    )
}
