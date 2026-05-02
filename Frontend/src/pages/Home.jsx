import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Home() {
    const videoRef = useRef(null)
    const [opacity, setOpacity] = useState(0)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        let animationFrameId;
        
        const updateFade = () => {
            const duration = video.duration
            const currentTime = video.currentTime
            
            if (duration > 0) {
                // 0.5s fade in at start, 0.5s fade out at end
                const fadeInDuration = 0.5
                const fadeOutDuration = 0.5
                
                if (currentTime < fadeInDuration) {
                    setOpacity(currentTime / fadeInDuration)
                } else if (currentTime > duration - fadeOutDuration) {
                    setOpacity((duration - currentTime) / fadeOutDuration)
                } else {
                    setOpacity(1)
                }
            }
            
            animationFrameId = requestAnimationFrame(updateFade)
        }

        const handleEnded = () => {
            setOpacity(0)
            setTimeout(() => {
                video.currentTime = 0
                video.play()
            }, 100)
        }

        video.addEventListener('ended', handleEnded)
        animationFrameId = requestAnimationFrame(updateFade)

        return () => {
            cancelAnimationFrame(animationFrameId)
            video.removeEventListener('ended', handleEnded)
        }
    }, [])

    const logos = [
        { name: 'Vision', initial: 'V', color: '#6366f1' },
        { name: 'Voice', initial: 'V', color: '#a855f7' },
        { name: 'Synthesis', initial: 'S', color: '#fcd34d' },
        { name: 'Analytics', initial: 'A', color: '#3b82f6' },
        { name: 'Intelligence', initial: 'I', color: '#10b981' },
        { name: 'Automation', initial: 'A', color: '#ec4899' },
    ]

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    return (
        <main className="relative min-h-screen flex flex-col overflow-hidden bg-background text-foreground font-geist cursor-none">
            {/* Custom Interactive Cursor */}
            <motion.div
                className="fixed w-8 h-8 rounded-full border border-primary/50 pointer-events-none z-[100] mix-blend-difference"
                animate={{
                    x: mousePos.x - 16,
                    y: mousePos.y - 16,
                    scale: 1,
                }}
                transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
            />
            <motion.div
                className="fixed w-1.5 h-1.5 rounded-full bg-white pointer-events-none z-[100]"
                animate={{
                    x: mousePos.x - 3,
                    y: mousePos.y - 3,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.2 }}
            />

            {/* Background Video Wrapper */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
                    muted
                    playsInline
                    autoPlay
                    style={{ opacity }}
                />
            </div>

            {/* Blurred Overlay Shape */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[984px] h-[527px] opacity-80 bg-gray-950 blur-[120px] pointer-events-none z-0"
            />

            {/* Interactive Particle Field */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full"
                        animate={{
                            x: [Math.random() * 1000 - 500, Math.random() * 1000 - 500],
                            y: [Math.random() * 1000 - 500, Math.random() * 1000 - 500],
                            opacity: [0.1, 0.4, 0.1],
                            scale: [1, 2, 1],
                        }}
                        transition={{
                            duration: 15 + Math.random() * 25,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            {/* Hero Content Wrapper */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 overflow-visible">
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    className="text-center"
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.15 }
                            }
                        }}
                        className="flex flex-col items-center"
                    >
                        <motion.h1 
                            variants={{
                                hidden: { opacity: 0, y: 60, filter: 'blur(20px)' },
                                visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
                            }}
                            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                            className="text-[75px] xs:text-[110px] md:text-[210px] font-normal leading-[0.9] tracking-[-0.05em] font-general mb-6 relative group cursor-default"
                        >
                            CALYX <span className="bg-clip-text text-transparent bg-gradient-to-tr from-[#6366f1] via-[#a855f7] to-[#fcd34d] animate-gradient-xy">AI</span>
                            <div className="absolute -inset-10 bg-primary/20 blur-[120px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        </motion.h1>
                        
                        <motion.p 
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 }
                            }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="text-hero-sub text-base md:text-2xl leading-relaxed max-w-3xl mx-auto opacity-50 font-geist tracking-widest mt-4 uppercase"
                        >
                            The next evolution of machine intelligence.<br className="hidden md:block" /> 
                            Optimized for high-performance talent acquisition.
                        </motion.p>

                        <motion.div
                            variants={{
                                hidden: { opacity: 0, scale: 0.95 },
                                visible: { opacity: 1, scale: 1 }
                            }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="mt-16 relative group"
                        >
                            <div className="absolute -inset-6 bg-primary/30 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <Link 
                                to="/signup" 
                                className="relative bg-white text-black px-12 py-6 rounded-full font-general font-bold text-xl hover:bg-primary hover:text-white transition-all duration-500 flex items-center gap-4 group/btn overflow-hidden"
                            >
                                <span className="relative z-10">Initialize Session</span>
                                <motion.span 
                                    className="material-icons relative z-10"
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >north_east</motion.span>
                                <div className="absolute inset-0 bg-primary translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Logo Marquee Section */}
            <div className="relative z-10 w-full pb-20">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-12 px-6">
                    <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    
                    <div className="flex-1 w-full overflow-hidden relative mask-fade-edges py-6">
                        <motion.div 
                            className="flex items-center gap-16 md:gap-24 w-max"
                            animate={{ x: [0, -1000] }}
                            transition={{ 
                                duration: 40, 
                                repeat: Infinity, 
                                ease: "linear" 
                            }}
                        >
                            {[...logos, ...logos, ...logos, ...logos].map((logo, i) => (
                                <motion.div 
                                    key={i} 
                                    whileHover={{ scale: 1.1, y: -8 }}
                                    className="flex items-center gap-5 group/logo"
                                >
                                    <div 
                                        className="w-14 h-14 md:w-16 md:h-16 rounded-[18px] md:rounded-[24px] flex items-center justify-center text-2xl md:text-3xl font-bold liquid-glass border border-white/10 group-hover/logo:border-white/40 transition-all shadow-2xl relative overflow-hidden"
                                        style={{ color: logo.color }}
                                    >
                                        <div className="absolute inset-0 bg-current opacity-[0.08] rounded-[18px]" />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                                        {/* Glass Shine */}
                                        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover/logo:translate-x-full transition-transform duration-1000" />
                                        <span className="relative z-10">{logo.initial}</span>
                                    </div>
                                    <span className="text-[10px] md:text-xs font-general font-bold text-hero-sub/60 uppercase tracking-[0.3em] group-hover/logo:text-foreground transition-colors">
                                        {logo.name}
                                    </span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
                }
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-xy {
                    background-size: 200% 200%;
                    animation: gradient-xy 8s ease infinite;
                }
            `}} />
        </main>
    )
}

